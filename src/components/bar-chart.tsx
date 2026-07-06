"use client";

interface BarChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
  color?: string;
}

export function BarChart({ data, title, color = "bg-primary" }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Tidak ada data</p>
        ) : (
          data.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="font-medium">{item.value.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
