interface TaxGaugeProps {
  label: string;
  valueCents: number;
  rate?: number;
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
}

export default function TaxGauge({ label, valueCents, rate }: TaxGaugeProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="text-right">
        <span className="font-mono text-sm font-medium">{formatEur(valueCents)}</span>
        {rate !== undefined && (
          <span className="text-xs text-slate-400 ml-2">({(rate * 100).toFixed(1)}%)</span>
        )}
      </div>
    </div>
  );
}
