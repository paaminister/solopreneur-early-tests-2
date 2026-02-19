/**
 * Finnish 2026 progressive income tax calculator for sole trader doctors.
 *
 * Sources:
 * - State tax brackets: Vero.fi 2026 (estimated based on 2025 + inflation adjustment)
 * - Municipal tax: flat rate per municipality (default Helsinki 18.5%)
 * - Church tax: optional, ~1-2% depending on parish
 * - Yrittajavahennys: 5% entrepreneur deduction on earned income
 */

// 2026 state income tax brackets (ansiotulon valtion tulovero)
// These are estimated for 2026 based on recent trends
const STATE_TAX_BRACKETS = [
  { lower: 0, upper: 20500, rate: 0 },
  { lower: 20500, upper: 30500, rate: 0.064 },
  { lower: 30500, upper: 50400, rate: 0.1764 },
  { lower: 50400, upper: 88200, rate: 0.2132 },
  { lower: 88200, upper: Infinity, rate: 0.3125 },
];

// Base tax at each bracket boundary (cumulative)
const STATE_TAX_BASE = [0, 0, 640, 4152.16, 12215.68];

export interface TaxParams {
  /** Total earned income in cents */
  earnedIncomeCents: number;
  /** Municipal tax rate as decimal (e.g., 0.185 for Helsinki) */
  municipalTaxRate: number;
  /** Church tax rate as decimal (0 if not a member) */
  churchTaxRate: number;
  /** Whether to apply 5% yrittajavahennys */
  applyEntrepreneurDeduction: boolean;
  /** YEL contribution in cents (deductible) */
  yelContributionCents: number;
}

export interface TaxResult {
  /** Gross earned income in cents */
  grossIncomeCents: number;
  /** Deductions in cents */
  deductionsCents: number;
  /** Taxable income after deductions, in cents */
  taxableIncomeCents: number;
  /** Yrittajavahennys amount in cents */
  entrepreneurDeductionCents: number;
  /** State income tax in cents */
  stateTaxCents: number;
  /** Municipal tax in cents */
  municipalTaxCents: number;
  /** Church tax in cents */
  churchTaxCents: number;
  /** Total tax in cents */
  totalTaxCents: number;
  /** Effective tax rate as decimal */
  effectiveRate: number;
  /** Marginal tax rate as decimal */
  marginalRate: number;
}

export function calculateTax(params: TaxParams): TaxResult {
  const {
    earnedIncomeCents,
    municipalTaxRate,
    churchTaxRate,
    applyEntrepreneurDeduction,
    yelContributionCents,
  } = params;

  const grossIncomeEur = earnedIncomeCents / 100;

  // Deductions: YEL is deducted from earned income
  const yelDeductionEur = yelContributionCents / 100;

  // Yrittajavahennys: 5% of business income (max deduction from earned income)
  let entrepreneurDeductionEur = 0;
  if (applyEntrepreneurDeduction) {
    entrepreneurDeductionEur = grossIncomeEur * 0.05;
  }

  const totalDeductionsEur = yelDeductionEur + entrepreneurDeductionEur;
  const taxableIncomeEur = Math.max(0, grossIncomeEur - totalDeductionsEur);

  // State tax (progressive brackets)
  const stateTaxEur = calculateStateTax(taxableIncomeEur);

  // Municipal tax (flat rate on taxable income)
  const municipalTaxEur = taxableIncomeEur * municipalTaxRate;

  // Church tax (flat rate on taxable income)
  const churchTaxEur = taxableIncomeEur * churchTaxRate;

  const totalTaxEur = stateTaxEur + municipalTaxEur + churchTaxEur;

  const effectiveRate = grossIncomeEur > 0 ? totalTaxEur / grossIncomeEur : 0;
  const marginalRate = getMarginalRate(taxableIncomeEur, municipalTaxRate, churchTaxRate);

  return {
    grossIncomeCents: earnedIncomeCents,
    deductionsCents: Math.round(totalDeductionsEur * 100),
    taxableIncomeCents: Math.round(taxableIncomeEur * 100),
    entrepreneurDeductionCents: Math.round(entrepreneurDeductionEur * 100),
    stateTaxCents: Math.round(stateTaxEur * 100),
    municipalTaxCents: Math.round(municipalTaxEur * 100),
    churchTaxCents: Math.round(churchTaxEur * 100),
    totalTaxCents: Math.round(totalTaxEur * 100),
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    marginalRate: Math.round(marginalRate * 10000) / 10000,
  };
}

function calculateStateTax(taxableIncomeEur: number): number {
  for (let i = STATE_TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = STATE_TAX_BRACKETS[i];
    if (taxableIncomeEur > bracket.lower) {
      const taxInBracket = (taxableIncomeEur - bracket.lower) * bracket.rate;
      return STATE_TAX_BASE[i] + taxInBracket;
    }
  }
  return 0;
}

function getMarginalRate(
  taxableIncomeEur: number,
  municipalRate: number,
  churchRate: number
): number {
  let stateMarginRate = 0;
  for (let i = STATE_TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (taxableIncomeEur > STATE_TAX_BRACKETS[i].lower) {
      stateMarginRate = STATE_TAX_BRACKETS[i].rate;
      break;
    }
  }
  return stateMarginRate + municipalRate + churchRate;
}

/** Default municipal tax rates for major Finnish cities (2026 estimates) */
export const MUNICIPAL_TAX_RATES: Record<string, number> = {
  Helsinki: 0.185,
  Espoo: 0.1775,
  Tampere: 0.1975,
  Vantaa: 0.19,
  Oulu: 0.2075,
  Turku: 0.1975,
  Jyvaskyla: 0.2075,
  Kuopio: 0.2125,
  Lahti: 0.2075,
  Rovaniemi: 0.2175,
};

/** Default church tax rate (ev.lut.) */
export const DEFAULT_CHURCH_TAX_RATE = 0.01;
