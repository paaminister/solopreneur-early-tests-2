"use client";

import { useCallback, useEffect, useState } from "react";
import TransactionForm from "@/components/TransactionForm";
import TransactionList from "@/components/TransactionList";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async () => {
    const res = await fetch("/api/transactions?limit=500");
    const json = await res.json();
    // API now returns { data, total, limit, offset, fiscal_year }
    setTransactions(json.data || json);
    setTotal(json.total ?? (json.data ? json.data.length : json.length));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TransactionForm onCreated={loadTransactions} />
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">All Transactions</h3>
              {!loading && <span className="text-xs text-slate-500">{total} total</span>}
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <TransactionList transactions={transactions} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
