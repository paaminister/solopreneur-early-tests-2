interface DashboardCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: "green" | "red" | "blue" | "amber";
}

const colorMap = {
  green: "border-green-500 bg-green-50",
  red: "border-red-500 bg-red-50",
  blue: "border-blue-500 bg-blue-50",
  amber: "border-amber-500 bg-amber-50",
};

export default function DashboardCard({ title, value, subtitle, color = "blue" }: DashboardCardProps) {
  return (
    <div className={`rounded-lg border-l-4 p-4 ${colorMap[color]}`}>
      <p className="text-sm text-slate-600">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
