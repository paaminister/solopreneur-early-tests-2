import DashboardCard from "@/components/DashboardCard";
import { getDb } from "@/lib/db";
import { calculateTax, MUNICIPAL_TAX_RATES, DEFAULT_CHURCH_TAX_RATE } from "@/lib/tax/calculator";
import { calculateYel } from "@/lib/tax/yel";
import { getCategoryById } from "@/lib/categories";
import { formatEur, DEMO_USER_ID, CURRENT_FISCAL_YEAR } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = getDb();

  const income = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND fiscal_year = ? AND deleted_at IS NULL")
    .get(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as { total: number };

  const expenses = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND fiscal_year = ? AND deleted_at IS NULL")
    .get(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as { total: number };

  const yelPaid = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND category = 'yel' AND fiscal_year = ? AND deleted_at IS NULL")
    .get(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as { total: number };

  const netProfit = income.total - expenses.total;

  const yelResult = calculateYel({ yelIncomeCents: 7000000, isNewEntrepreneur: false });

  const taxResult = calculateTax({
    earnedIncomeCents: netProfit,
    municipalTaxRate: MUNICIPAL_TAX_RATES.Helsinki,
    churchTaxRate: DEFAULT_CHURCH_TAX_RATE,
    applyEntrepreneurDeduction: true,
    yelContributionCents: yelPaid.total || yelResult.annualContributionCents,
  });

  const txCount = db
    .prepare("SELECT COUNT(*) as c FROM transactions WHERE user_id = ? AND fiscal_year = ? AND deleted_at IS NULL")
    .get(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as { c: number };

  const unreconciledCount = db
    .prepare("SELECT COUNT(*) as c FROM transactions WHERE user_id = ? AND fiscal_year = ? AND reconciled = 0 AND deleted_at IS NULL")
    .get(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as { c: number };

  // Use category-level requiresProof to distinguish "not needed" from "missing"
  const allTx = db
    .prepare("SELECT id, category, voucher_type FROM transactions WHERE user_id = ? AND fiscal_year = ? AND deleted_at IS NULL")
    .all(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as Array<{ id: number; category: string; voucher_type: string }>;

  let missingProofCount = 0;
  for (const tx of allTx) {
    const cat = getCategoryById(tx.category);
    const hasProof = tx.voucher_type !== "none";
    const needsProof = cat?.requiresProof !== false;
    if (!hasProof && needsProof) {
      missingProofCount++;
    }
  }

  const ennakkoveroRow = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM ennakkovero_schedule WHERE user_id = ? AND year = ? AND paid = 1")
    .get(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as { total: number };

  const taxCard = db
    .prepare("SELECT * FROM tax_card WHERE user_id = ? AND year = ? ORDER BY id DESC LIMIT 1")
    .get(DEMO_USER_ID, CURRENT_FISCAL_YEAR) as { base_rate_pct: number; in_ennakkoperintarekisteri: number } | undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard ({CURRENT_FISCAL_YEAR})</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard title="Total Income YTD" value={formatEur(income.total)} color="green" />
        <DashboardCard title="Total Expenses YTD" value={formatEur(expenses.total)} color="red" />
        <DashboardCard title="Net Profit" value={formatEur(netProfit)} color={netProfit >= 0 ? "green" : "red"} />
        <DashboardCard
          title="Estimated Tax"
          value={formatEur(taxResult.totalTaxCents)}
          subtitle={`Effective rate: ${(taxResult.effectiveRate * 100).toFixed(1)}%`}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard
          title="YEL Monthly"
          value={formatEur(yelResult.monthlyContributionCents)}
          subtitle={`Annual: ${formatEur(yelResult.annualContributionCents)}`}
          color="blue"
        />
        <DashboardCard title="Transactions" value={String(txCount.c)} color="blue" />
        <DashboardCard
          title="Unreconciled"
          value={String(unreconciledCount.c)}
          color={unreconciledCount.c > 0 ? "amber" : "green"}
        />
        <DashboardCard
          title="Marginal Tax Rate"
          value={`${(taxResult.marginalRate * 100).toFixed(1)}%`}
          subtitle="Next EUR earned"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard
          title="Missing Tosite"
          value={String(missingProofCount)}
          subtitle={missingProofCount > 0 ? "Kirjanpitolaki requires proof" : "All entries compliant"}
          color={missingProofCount > 0 ? "red" : "green"}
        />
        <DashboardCard
          title="Ennakkovero Paid"
          value={formatEur(ennakkoveroRow.total)}
          subtitle="Prepaid tax this year"
          color="blue"
        />
        <DashboardCard
          title="Verokortti Rate"
          value={taxCard ? `${taxCard.base_rate_pct}%` : "Not set"}
          subtitle={taxCard?.in_ennakkoperintarekisteri ? "In ennakkoperintarekisteri" : "NOT in register"}
          color={taxCard ? "blue" : "amber"}
        />
        <DashboardCard
          title="Tosite Compliance"
          value={missingProofCount === 0 ? "OK" : "Action needed"}
          subtitle={`${txCount.c - missingProofCount}/${txCount.c} entries compliant`}
          color={missingProofCount === 0 ? "green" : "amber"}
        />
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Quick Info</h2>
        <p className="text-sm text-slate-600">
          This is a demo scaffold with seeded data. All tax calculations use real 2026 Finnish brackets.
          Bank sync, OCR, and settlement parsing use mock data. Visit each section to test the endpoints.
        </p>
      </div>
    </div>
  );
}
