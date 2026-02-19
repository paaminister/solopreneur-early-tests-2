"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";

interface TransactionFormProps {
  onCreated: () => void;
}

export default function TransactionForm({ onCreated }: TransactionFormProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [voucherType, setVoucherType] = useState("none");
  const [loading, setLoading] = useState(false);

  const filteredCategories = CATEGORIES.filter((c) => c.type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const amountCents = Math.round(parseFloat(amount) * 100);

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        date,
        amount_cents: amountCents,
        category: category || filteredCategories[0]?.id,
        description: description || undefined,
        voucher_type: voucherType,
        idempotency_key: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }),
    });

    setAmount("");
    setDescription("");
    setVoucherType("none");
    setLoading(false);
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold">Add Transaction</h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setType("income"); setCategory(""); }}
          className={`px-3 py-1 rounded text-sm ${type === "income" ? "bg-green-600 text-white" : "bg-slate-100"}`}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => { setType("expense"); setCategory(""); }}
          className={`px-3 py-1 rounded text-sm ${type === "expense" ? "bg-red-600 text-white" : "bg-slate-100"}`}
        >
          Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Amount (EUR)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
          required
        />
      </div>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      >
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.labelFi} ({c.label})
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Tosite (voucher proof)</label>
          <select
            value={voucherType}
            onChange={(e) => setVoucherType(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="none">Ei tositetta</option>
            <option value="receipt">Kuitti (receipt)</option>
            <option value="bank_statement">Tiliote (bank statement)</option>
            <option value="settlement">Tilitys (settlement)</option>
            <option value="e_invoice">Verkkolasku (e-invoice)</option>
            <option value="manual">Muistiotosite (manual)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Description</label>
          <input
            type="text"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !amount}
        className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Add Transaction"}
      </button>
    </form>
  );
}
