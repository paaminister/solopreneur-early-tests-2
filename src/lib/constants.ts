/**
 * Application-wide constants.
 */

/** Currency code used throughout the application */
export const CURRENCY = "EUR" as const;

/** Locale for formatting */
export const LOCALE = "fi-FI" as const;

/** Timezone for display */
export const TIMEZONE = "Europe/Helsinki" as const;

/** Current fiscal year */
export const CURRENT_FISCAL_YEAR = 2026;

/** Maximum reasonable transaction amount in cents (EUR 1,000,000) */
export const MAX_AMOUNT_CENTS = 100_000_000;

/** Minimum transaction amount in cents (EUR 0.01) */
export const MIN_AMOUNT_CENTS = 1;

/** Demo user_id for the local scaffold (no auth) */
export const DEMO_USER_ID = "demo-doctor-001";

/** Format cents to EUR string */
export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString(LOCALE, { style: "currency", currency: CURRENCY });
}

/** Valid voucher types */
export const VOUCHER_TYPES = [
  "receipt",
  "bank_statement",
  "settlement",
  "e_invoice",
  "manual",
  "none",
] as const;

export type VoucherType = (typeof VOUCHER_TYPES)[number];

/** Valid transaction types */
export const TRANSACTION_TYPES = ["income", "expense"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
