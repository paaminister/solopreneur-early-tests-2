import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { containsHetu } from "@/lib/validation/hetu";
import { ocrRequestSchema } from "@/lib/validation/schemas";
import { withErrorHandling, validationError, errorResponse } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const parsed = ocrRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const { receiptId, filename } = parsed.data;

    if (filename && containsHetu(filename)) {
      return errorResponse(
        "HETU detected. Please redact patient identifying information before uploading.",
        422
      );
    }

    const ocrResult = {
      vendor: "Duodecim Oy",
      date: "2026-02-15",
      amount_cents: 12500,
      category_suggestion: "ammattikirjallisuus",
      confidence: 0.92,
      raw_text: "DUODECIM OY\nLaskun pvm: 15.02.2026\nYhteensa: 125,00 EUR\nSis. ALV 25,5%: 25,71 EUR",
    };

    if (receiptId) {
      const db = getDb();
      db.prepare("UPDATE receipts SET ocr_result = ? WHERE id = ?").run(JSON.stringify(ocrResult), receiptId);
    }

    return NextResponse.json(ocrResult);
  });
}
