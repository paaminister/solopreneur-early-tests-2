interface Transaction {
  id: number;
  type: string;
  date: string;
  amount_cents: number;
  category: string;
  description: string | null;
  reconciled: number;
  voucher_type: string | null;
}

const VOUCHER_LABELS: Record<string, { label: string; color: string }> = {
  receipt: { label: "Kuitti", color: "bg-green-100 text-green-700" },
  bank_statement: { label: "Tiliote", color: "bg-blue-100 text-blue-700" },
  settlement: { label: "Tilitys", color: "bg-purple-100 text-purple-700" },
  e_invoice: { label: "Verkkolasku", color: "bg-cyan-100 text-cyan-700" },
  manual: { label: "Muistio", color: "bg-slate-100 text-slate-700" },
  none: { label: "Puuttuu", color: "bg-red-100 text-red-600" },
};

interface TransactionListProps {
  transactions: Transaction[];
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
}

export default function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return <p className="text-slate-500 text-sm">No transactions yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4 text-right">Amount</th>
            <th className="py-2 pr-4">Tosite</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b hover:bg-slate-50">
              <td className="py-2 pr-4">{tx.date}</td>
              <td className="py-2 pr-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    tx.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {tx.type}
                </span>
              </td>
              <td className="py-2 pr-4 text-slate-600">{tx.category}</td>
              <td className="py-2 pr-4 text-slate-600">{tx.description || "-"}</td>
              <td className={`py-2 pr-4 text-right font-mono ${tx.type === "income" ? "text-green-700" : "text-red-700"}`}>
                {tx.type === "income" ? "+" : "-"}{formatEur(tx.amount_cents)}
              </td>
              <td className="py-2 pr-4">
                {(() => {
                  const v = VOUCHER_LABELS[tx.voucher_type || "none"] || VOUCHER_LABELS.none;
                  return <span className={`px-2 py-0.5 rounded text-xs ${v.color}`}>{v.label}</span>;
                })()}
              </td>
              <td className="py-2">
                {tx.reconciled ? (
                  <span className="text-green-600 text-xs">Reconciled</span>
                ) : (
                  <span className="text-amber-600 text-xs">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
