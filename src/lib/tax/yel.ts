/**
 * YEL (Yrittajan elakevakuutus) calculation for 2026.
 *
 * Source: Tyoelake.fi, Varma.fi
 * - Base rate: 24.4% of confirmed YEL income
 * - New entrepreneur discount: 22% for first 48 months
 * - Minimum YEL income: EUR 9,423.09/year
 * - Maximum YEL income: EUR 214,000/year (estimated 2026)
 */

export const YEL_RATE_2026 = 0.244;
export const YEL_NEW_ENTREPRENEUR_DISCOUNT = 0.22;
export const YEL_MIN_INCOME_CENTS = 942309;
export const YEL_MAX_INCOME_CENTS = 21400000;

export interface YelParams {
  /** Confirmed YEL work income in cents */
  yelIncomeCents: number;
  /** Whether the new entrepreneur discount applies (first 48 months) */
  isNewEntrepreneur: boolean;
}

export interface YelResult {
  /** YEL income used for calculation in cents */
  yelIncomeCents: number;
  /** Base rate before any discount */
  baseRate: number;
  /** Discount rate applied (0 if not new entrepreneur) */
  discountRate: number;
  /** Effective rate after discount */
  effectiveRate: number;
  /** Annual YEL contribution in cents */
  annualContributionCents: number;
  /** Monthly YEL contribution in cents */
  monthlyContributionCents: number;
  /** Annual pension accrual in cents (rough estimate: 1.5% of YEL income) */
  annualPensionAccrualCents: number;
}

export function calculateYel(params: YelParams): YelResult {
  const { yelIncomeCents, isNewEntrepreneur } = params;

  // Clamp to min/max
  const clampedIncome = Math.max(
    YEL_MIN_INCOME_CENTS,
    Math.min(YEL_MAX_INCOME_CENTS, yelIncomeCents)
  );

  const discountRate = isNewEntrepreneur ? YEL_NEW_ENTREPRENEUR_DISCOUNT : 0;
  const effectiveRate = YEL_RATE_2026 * (1 - discountRate);

  const annualContribution = Math.round(clampedIncome * effectiveRate);
  const monthlyContribution = Math.round(annualContribution / 12);

  // Rough pension accrual estimate: 1.5% of YEL income per year (age 17-52)
  const pensionAccrual = Math.round(clampedIncome * 0.015);

  return {
    yelIncomeCents: clampedIncome,
    baseRate: YEL_RATE_2026,
    discountRate,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    annualContributionCents: annualContribution,
    monthlyContributionCents: monthlyContribution,
    annualPensionAccrualCents: pensionAccrual,
  };
}
