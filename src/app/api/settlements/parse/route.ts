import { NextRequest, NextResponse } from "next/server";
import { parseSettlementPdf } from "@/lib/settlements/parser";
import { parseSettlementSchema } from "@/lib/validation/schemas";
import { withErrorHandling, validationError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const parsed = parseSettlementSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const result = parseSettlementPdf(parsed.data.filename);

    return NextResponse.json({
      ...result,
      source: "mock",
      message: "In production, this would use Google Document AI to parse the actual PDF.",
    });
  });
}
