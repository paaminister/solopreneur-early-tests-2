"use client";

import { useCallback, useEffect, useState } from "react";

interface Settlement {
  id: number;
  clinic: string;
  period: string;
  gross_cents: number;
  commission_cents: number;
  net_cents: number;
  raw_parse: string | null;
}

interface ParseResult {
  clinic: string;
  period: string;
  grossCents: number;
  commissionCents: number;
  commissionPct: number;
  netCents: number;
  visits: number;
  avgFeeCents: number;
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [filename, setFilename] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSettlements = useCallback(async () => {
    const res = await fetch("/api/settlements");
    setSettlements(await res.json());
  }, []);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  async function handleParse() {
    if (!filename) return;
    setLoading(true);

    const res = await fetch("/api/settlements/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    const result = await res.json();
    setParseResult(result);

    // Also save the parsed settlement (with linked transactions)
    await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic: result.clinic,
        period: result.period,
        gross_cents: result.grossCents,
        commission_cents: result.commissionCents,
        net_cents: result.netCents,
        idempotency_key: `settlement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }),
    });

    setFilename("");
    setLoading(false);
    loadSettlements();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Clinic Settlements</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Upload Settlement PDF (Mock)</h3>
            <p className="text-xs text-slate-500 mb-3">
              Simulates uploading a clinic chain settlement PDF. Try filenames containing
              &quot;terveystalo&quot;, &quot;mehilainen&quot;, or &quot;pihlajalinna&quot; for different mock data.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., mehilainen-tilitys-2026-01.pdf"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleParse}
                disabled={loading || !filename}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? "Parsing..." : "Parse PDF"}
              </button>
            </div>
          </div>

          {parseResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Parse Result (Mock)</h3>
              <div className="text-sm space-y-1">
                <p><strong>Clinic:</strong> {parseResult.clinic}</p>
                <p><strong>Period:</strong> {parseResult.period}</p>
                <p><strong>Gross sales:</strong> {formatEur(parseResult.grossCents)}</p>
                <p><strong>Commission ({parseResult.commissionPct}%):</strong> {formatEur(parseResult.commissionCents)}</p>
                <p><strong>Net payout:</strong> {formatEur(parseResult.netCents)}</p>
                <p><strong>Patient visits:</strong> {parseResult.visits}</p>
                <p><strong>Avg fee/visit:</strong> {formatEur(parseResult.avgFeeCents)}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Settlement History</h3>
          {settlements.length === 0 ? (
            <p className="text-sm text-slate-500">No settlements yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Clinic</th>
                  <th className="py-2 pr-4 text-right">Gross</th>
                  <th className="py-2 pr-4 text-right">Commission</th>
                  <th className="py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 pr-4">{s.period}</td>
                    <td className="py-2 pr-4">{s.clinic}</td>
                    <td className="py-2 pr-4 text-right font-mono">{formatEur(s.gross_cents)}</td>
                    <td className="py-2 pr-4 text-right font-mono text-red-600">{formatEur(s.commission_cents)}</td>
                    <td className="py-2 text-right font-mono text-green-700">{formatEur(s.net_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
