/**
 * Zod validation schemas for all API inputs.
 */
import { z } from "zod";
import { MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS, VOUCHER_TYPES, TRANSACTION_TYPES } from "@/lib/constants";
import { CATEGORIES } from "@/lib/categories";

/** ISO date string validator (YYYY-MM-DD) */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format")
  .refine((d) => {
    const parsed = new Date(d + "T00:00:00Z");
    return !isNaN(parsed.getTime());
  }, "Invalid date");

/** Positive integer cents within reasonable bounds */
const amountCents = z
  .number()
  .int("Amount must be a whole number (cents)")
  .min(MIN_AMOUNT_CENTS, `Amount must be at least ${MIN_AMOUNT_CENTS} cent`)
  .max(MAX_AMOUNT_CENTS, `Amount cannot exceed ${MAX_AMOUNT_CENTS} cents (EUR 1,000,000)`);

/** Valid category IDs */
const categoryIds = CATEGORIES.map((c) => c.id);

// ── Transaction ──────────────────────────────────────────────────────
export const createTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    date: isoDateString,
    amount_cents: amountCents,
    category: z.string().refine((c) => categoryIds.includes(c), {
      message: `Category must be one of: ${categoryIds.join(", ")}`,
    }),
    description: z.string().max(500).optional(),
    voucher_type: z.enum(VOUCHER_TYPES).optional().default("none"),
    idempotency_key: z.string().max(64).optional(),
  })
  .refine(
    (data) => {
      const cat = CATEGORIES.find((c) => c.id === data.category);
      return cat ? cat.type === data.type : false;
    },
    { message: "Category type must match transaction type (income category for income, expense category for expense)" }
  );

// ── Receipt ──────────────────────────────────────────────────────────
export const createReceiptSchema = z.object({
  filename: z.string().min(1).max(255),
  idempotency_key: z.string().max(64).optional(),
});

// ── OCR ──────────────────────────────────────────────────────────────
export const ocrRequestSchema = z.object({
  receiptId: z.number().int().positive().optional(),
  filename: z.string().min(1).max(255).optional(),
});

// ── Settlement ───────────────────────────────────────────────────────
export const createSettlementSchema = z.object({
  clinic: z.string().min(1).max(100),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM format"),
  gross_cents: amountCents,
  commission_cents: amountCents,
  net_cents: amountCents,
  idempotency_key: z.string().max(64).optional(),
});

export const parseSettlementSchema = z.object({
  filename: z.string().min(1).max(255),
});

// ── Tax Card ─────────────────────────────────────────────────────────
export const createTaxCardSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  card_type: z.enum(["main", "secondary", "entrepreneur"]),
  base_rate_pct: z.number().min(0).max(100),
  additional_rate_pct: z.number().min(0).max(100).optional(),
  income_limit_cents: z.number().int().min(0).optional(),
  in_ennakkoperintarekisteri: z.number().int().min(0).max(1).optional().default(1),
  notes: z.string().max(500).optional(),
  idempotency_key: z.string().max(64).optional(),
});

// ── Ennakkovero ──────────────────────────────────────────────────────
export const createEnnakkoveroSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  due_date: isoDateString,
  amount_cents: amountCents,
  idempotency_key: z.string().max(64).optional(),
});

// ── Query params ─────────────────────────────────────────────────────
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
  fiscal_year: z.coerce.number().int().min(2020).max(2030).optional(),
});
