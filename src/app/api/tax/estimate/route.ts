import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateTax, MUNICIPAL_TAX_RATES, DEFAULT_CHURCH_TAX_RATE } from "@/lib/tax/calculator";
import { calculateYel } from "@/lib/tax/yel";
import { withErrorHandling } from "@/lib/api-utils";
import { DEMO_USER_ID, CURRENT_FISCAL_YEAR } from "@/lib/constants";

export async function GET(request: NextRequest) {
  return withErrorHandling(() => {
    const searchParams = request.nextUrl.searchParams;
    const municipality = searchParams.get("municipality") || "Helsinki";
    const churchMember = searchParams.get("church") !== "false";
    const yelIncome = parseInt(searchParams.get("yel_income_cents") || "7000000", 10);
    const isNewEntrepreneur = searchParams.get("new_entrepreneur") === "true";
    const fiscalYear = parseInt(searchParams.get("fiscal_year") || String(CURRENT_FISCAL_YEAR), 10);

    const db = getDb();

    const incomeRow = db
      .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND fiscal_year = ? AND deleted_at IS NULL")
      .get(DEMO_USER_ID, fiscalYear) as { total: number };

    const expenseRow = db
      .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND category != 'yel' AND fiscal_year = ? AND deleted_at IS NULL")
      .get(DEMO_USER_ID, fiscalYear) as { total: number };

    const yelRow = db
      .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND category = 'yel' AND fiscal_year = ? AND deleted_at IS NULL")
      .get(DEMO_USER_ID, fiscalYear) as { total: number };

    const netProfitCents = incomeRow.total - expenseRow.total;

    const yelResult = calculateYel({ yelIncomeCents: yelIncome, isNewEntrepreneur });

    const municipalRate = MUNICIPAL_TAX_RATES[municipality] || 0.185;
    const churchRate = churchMember ? DEFAULT_CHURCH_TAX_RATE : 0;

    const taxResult = calculateTax({
      earnedIncomeCents: netProfitCents,
      municipalTaxRate: municipalRate,
      churchTaxRate: churchRate,
      applyEntrepreneurDeduction: true,
      yelContributionCents: yelRow.total || yelResult.annualContributionCents,
    });

    return NextResponse.json({
      period: `${fiscalYear} YTD`,
      fiscal_year: fiscalYear,
      totalIncomeCents: incomeRow.total,
      totalExpensesCents: expenseRow.total,
      yelPaidCents: yelRow.total,
      netProfitCents,
      municipality,
      churchMember,
      yel: yelResult,
      tax: taxResult,
    });
  });
}
