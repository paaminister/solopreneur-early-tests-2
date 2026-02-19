"use client";

import { useCallback, useEffect, useState } from "react";

interface BankTransaction {
  id: number;
  date: string;
  amount_cents: number;
  description: string;
  counterpart: string | null;
  reference: string | null;
  matched_transaction_id: number | null;
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
}

export default function BankPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    const res = await fetch("/api/banking");
    setTransactions(await res.json());
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/banking/sync", { method: "POST" });
    const data = await res.json();
    setSyncResult(`Synced ${data.newTransactions} new transactions (mock). Total: ${data.totalTransactions}`);
    setSyncing(false);
    loadTransactions();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bank Transactions (PSD2 Mock)</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync Bank (Mock)"}
        </button>
      </div>

      {syncResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
          {syncResult}
        </div>
      )}

      <div className="bg-white border rounded-lg p-4">
        <p className="text-xs text-slate-500 mb-3">
          In production, these would come from Enable Banking PSD2 API. Click &quot;Sync Bank&quot; to simulate importing new transactions.
        </p>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No bank transactions. Click Sync to import mock data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Counterpart</th>
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b hover:bg-slate-50">
                  <td className="py-2 pr-4">{tx.date}</td>
                  <td className="py-2 pr-4">{tx.description}</td>
                  <td className="py-2 pr-4 text-slate-600">{tx.counterpart || "-"}</td>
                  <td className="py-2 pr-4 text-xs text-slate-400 font-mono">{tx.reference || "-"}</td>
                  <td className={`py-2 text-right font-mono ${tx.amount_cents >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatEur(tx.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
