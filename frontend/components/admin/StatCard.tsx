interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}

export default function StatCard({ label, value, icon, color = "var(--color-apple-blue)" }: StatCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-apple-gray1)" }}>{label}</p>
          <p className="text-3xl font-semibold" style={{ color }}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
