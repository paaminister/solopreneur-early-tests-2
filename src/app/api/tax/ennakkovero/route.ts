import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateTax, MUNICIPAL_TAX_RATES, DEFAULT_CHURCH_TAX_RATE } from "@/lib/tax/calculator";
import { compareEnnakkovero, type EnnakkoveroInstallment } from "@/lib/tax/ennakkovero";
import { createEnnakkoveroSchema } from "@/lib/validation/schemas";
import { withErrorHandling, validationError, checkIdempotency, storeIdempotency } from "@/lib/api-utils";
import { DEMO_USER_ID, CURRENT_FISCAL_YEAR } from "@/lib/constants";

export async function GET(request: NextRequest) {
  return withErrorHandling(() => {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || String(CURRENT_FISCAL_YEAR), 10);
    const municipality = searchParams.get("municipality") || "Helsinki";

    const db = getDb();

    const installments = db
      .prepare("SELECT * FROM ennakkovero_schedule WHERE user_id = ? AND year = ? ORDER BY due_date")
      .all(DEMO_USER_ID, year) as EnnakkoveroInstallment[];

    // Calculate current YTD tax estimate (fiscal year scoped)
    const incomeRow = db
      .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND fiscal_year = ? AND deleted_at IS NULL")
      .get(DEMO_USER_ID, year) as { total: number };
    const expenseRow = db
      .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND fiscal_year = ? AND deleted_at IS NULL")
      .get(DEMO_USER_ID, year) as { total: number };

    const netProfit = incomeRow.total - expenseRow.total;
    const municipalRate = MUNICIPAL_TAX_RATES[municipality] || 0.185;

    const taxResult = calculateTax({
      earnedIncomeCents: netProfit,
      municipalTaxRate: municipalRate,
      churchTaxRate: DEFAULT_CHURCH_TAX_RATE,
      applyEntrepreneurDeduction: true,
      yelContributionCents: 0,
    });

    const currentMonth = new Date().getMonth() + 1;
    const comparison = compareEnnakkovero(installments, taxResult.totalTaxCents, currentMonth);

    // Verokortti comparison
    const taxCard = db
      .prepare("SELECT * FROM tax_card WHERE user_id = ? AND year = ? ORDER BY id DESC LIMIT 1")
      .get(DEMO_USER_ID, year) as { base_rate_pct: number; additional_rate_pct: number | null } | undefined;

    let verokorttiComparison = null;
    if (taxCard && incomeRow.total > 0) {
      const withholdingRate = taxCard.base_rate_pct / 100;
      const effectiveRate = taxResult.effectiveRate;
      verokorttiComparison = {
        verokorttiRate: taxCard.base_rate_pct,
        calculatedEffectiveRate: Math.round(effectiveRate * 1000) / 10,
        difference: Math.round((withholdingRate - effectiveRate) * 1000) / 10,
        message: withholdingRate > effectiveRate + 0.02
          ? `Verokorttisi pidatysprosentti (${taxCard.base_rate_pct}%) on ${Math.round((withholdingRate - effectiveRate) * 1000) / 10} prosenttiyksikkoa todellista veroastettasi (${Math.round(effectiveRate * 1000) / 10}%) korkeampi.`
          : withholdingRate < effectiveRate - 0.02
          ? `Verokorttisi pidatysprosentti (${taxCard.base_rate_pct}%) on ${Math.round((effectiveRate - withholdingRate) * 1000) / 10} prosenttiyksikkoa todellista veroastettasi (${Math.round(effectiveRate * 1000) / 10}%) matalampi. Harkitse korotusta.`
          : `Verokorttisi pidatysprosentti (${taxCard.base_rate_pct}%) vastaa hyvin todellista veroastettasi (${Math.round(effectiveRate * 1000) / 10}%).`,
      };
    }

    return NextResponse.json({
      year,
      installments,
      comparison,
      verokorttiComparison,
    });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const parsed = createEnnakkoveroSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { year, due_date, amount_cents, idempotency_key } = parsed.data;

    const existing = checkIdempotency(idempotency_key, "ennakkovero_schedule");
    if (existing) return NextResponse.json(existing, { status: 200 });

    const db = getDb();
    const result = db
      .prepare("INSERT INTO ennakkovero_schedule (user_id, year, due_date, amount_cents) VALUES (?, ?, ?, ?)")
      .run(DEMO_USER_ID, year, due_date, amount_cents);

    const created = db.prepare("SELECT * FROM ennakkovero_schedule WHERE id = ?").get(result.lastInsertRowid);

    storeIdempotency(idempotency_key, "ennakkovero_schedule", created);
    return NextResponse.json(created, { status: 201 });
  });
}
