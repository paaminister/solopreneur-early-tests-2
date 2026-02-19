/**
 * Mock settlement PDF parser.
 *
 * In production, this would call Google Document AI to extract data
 * from clinic chain settlement PDFs. For the demo scaffold, it returns
 * realistic mock data.
 */

export interface SettlementParseResult {
  clinic: string;
  period: string;
  grossCents: number;
  commissionCents: number;
  commissionPct: number;
  netCents: number;
  visits: number;
  avgFeeCents: number;
}

/**
 * Mock parse a settlement PDF.
 * In production: POST to Google Document AI, extract structured fields.
 * Here: returns hardcoded realistic data based on filename hints.
 */
export function parseSettlementPdf(filename: string): SettlementParseResult {
  const lower = filename.toLowerCase();

  // Vary mock data slightly based on filename
  if (lower.includes("terveystalo")) {
    return {
      clinic: "Terveystalo",
      period: "2026-01",
      grossCents: 800000,
      commissionCents: 200000,
      commissionPct: 25,
      netCents: 600000,
      visits: 38,
      avgFeeCents: 21053,
    };
  }

  if (lower.includes("pihlajalinna")) {
    return {
      clinic: "Pihlajalinna",
      period: "2026-01",
      grossCents: 650000,
      commissionCents: 175500,
      commissionPct: 27,
      netCents: 474500,
      visits: 30,
      avgFeeCents: 21667,
    };
  }

  // Default: Mehilainen-like data
  return {
    clinic: "Mehilainen",
    period: "2026-01",
    grossCents: 1000000,
    commissionCents: 250000,
    commissionPct: 25,
    netCents: 750000,
    visits: 45,
    avgFeeCents: 22222,
  };
}
