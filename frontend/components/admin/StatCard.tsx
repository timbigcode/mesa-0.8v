interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

export default function StatCard({ label, value, icon, color = "var(--color-n-900)" }: StatCardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium mb-1" style={{ color: "var(--color-n-500)" }}>{label}</p>
          <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--color-n-50)", color: "var(--color-n-400)" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
