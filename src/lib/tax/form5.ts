/**
 * Form 5 (Elinkeinotoiminnan veroilmoitus) field mapping.
 *
 * Maps transaction categories to the correct Form 5 line items
 * for a sole trader doctor's annual tax return.
 *
 * Depreciation:
 *   Assets > EUR 1,200 are depreciated using the 25% reducing balance
 *   method (menojäännöspoisto) per Finnish EVL § 30-34.
 *   Assets <= EUR 1,200 are expensed immediately.
 */

export interface Form5Data {
  /** Liikevaihto (Revenue/Turnover) */
  revenue: number;
  /** Materiaalit ja palvelut (Materials and services) */
  materialsAndServices: number;
  /** Henkilostokulut (Personnel costs) - usually 0 for solo doctor */
  personnelCosts: number;
  /** Poistot (Depreciation) */
  depreciation: number;
  /** Muut liiketoiminnan kulut (Other business expenses) */
  otherExpenses: number;
  /** Liikevoitto/-tappio (Operating profit/loss) */
  operatingProfit: number;
  /** YEL-vakuutusmaksut (YEL insurance premiums - deducted in personal taxation) */
  yelPremiums: number;
  /** Elinkeinotoiminnan tulos (Business result) */
  businessResult: number;
  /** Breakdown by category */
  expenseBreakdown: Record<string, number>;
  /** Depreciation details for assets being depreciated */
  depreciationDetails: Array<{
    category: string;
    originalAmountCents: number;
    depreciationYears: number;
    remainingCents: number;
    annualDepreciationCents: number;
  }>;
}

/** Which Form 5 section each expense category maps to */
const CATEGORY_TO_FORM5_SECTION: Record<string, string> = {
  // Revenue
  clinic_income: "revenue",
  other_income: "revenue",

  // Other business expenses
  yel: "yelPremiums",
  potilasvakuutus: "otherExpenses",
  laakariliitto: "otherExpenses",
  tyohuonevahennys: "otherExpenses",
  matkakulut: "otherExpenses",
  taydennyskoulutus: "otherExpenses",
  ammattikirjallisuus: "otherExpenses",
  tyovaatteet: "otherExpenses",
  puhelin_netti: "otherExpenses",
  tilitoimisto: "otherExpenses",
  vakuutukset: "otherExpenses",
  toimistotarvikkeet: "otherExpenses",
  muut_kulut: "otherExpenses",

  // Equipment: depreciable items go to "depreciation", small items to "otherExpenses"
  // This is handled in the logic below, not via this map
  laitteet: "laitteet_special",
};

/** Depreciation rate for 25% reducing balance method */
const DEPRECIATION_RATE = 0.25;

/** Threshold above which assets must be depreciated (EUR 1,200 = 120000 cents) */
const DEPRECIATION_THRESHOLD_CENTS = 120000;

export function generateForm5(
  transactions: Array<{
    type: string;
    amount_cents: number;
    category: string;
    depreciation_years: number | null;
    depreciation_remaining_cents: number | null;
  }>
): Form5Data {
  let revenue = 0;
  let yelPremiums = 0;
  let otherExpenses = 0;
  let depreciation = 0;
  const expenseBreakdown: Record<string, number> = {};
  const depreciationDetails: Form5Data["depreciationDetails"] = [];

  for (const tx of transactions) {
    const section = CATEGORY_TO_FORM5_SECTION[tx.category] || "otherExpenses";

    if (tx.type === "income") {
      revenue += tx.amount_cents;
      continue;
    }

    // Track expense breakdown
    if (!expenseBreakdown[tx.category]) {
      expenseBreakdown[tx.category] = 0;
    }
    expenseBreakdown[tx.category] += tx.amount_cents;

    // Special handling for laitteet (equipment)
    if (section === "laitteet_special") {
      if (tx.depreciation_years && tx.depreciation_remaining_cents !== null) {
        // This is a depreciable asset: use 25% reducing balance
        const annualDepreciation = Math.round(tx.depreciation_remaining_cents * DEPRECIATION_RATE);
        depreciation += annualDepreciation;
        depreciationDetails.push({
          category: tx.category,
          originalAmountCents: tx.amount_cents,
          depreciationYears: tx.depreciation_years,
          remainingCents: tx.depreciation_remaining_cents,
          annualDepreciationCents: annualDepreciation,
        });
      } else if (tx.amount_cents > DEPRECIATION_THRESHOLD_CENTS) {
        // Should be depreciated but no depreciation_years set — calculate from defaults
        const annualDepreciation = Math.round(tx.amount_cents * DEPRECIATION_RATE);
        depreciation += annualDepreciation;
        depreciationDetails.push({
          category: tx.category,
          originalAmountCents: tx.amount_cents,
          depreciationYears: 3, // default useful life
          remainingCents: tx.amount_cents,
          annualDepreciationCents: annualDepreciation,
        });
      } else {
        // Small equipment — expense immediately
        otherExpenses += tx.amount_cents;
      }
    } else if (section === "yelPremiums") {
      yelPremiums += tx.amount_cents;
    } else {
      otherExpenses += tx.amount_cents;
    }
  }

  const totalExpenses = otherExpenses + depreciation;
  const operatingProfit = revenue - totalExpenses;
  const businessResult = operatingProfit; // YEL deducted in personal tax, not here

  return {
    revenue,
    materialsAndServices: 0,
    personnelCosts: 0,
    depreciation,
    otherExpenses,
    operatingProfit,
    yelPremiums,
    businessResult,
    expenseBreakdown,
    depreciationDetails,
  };
}
