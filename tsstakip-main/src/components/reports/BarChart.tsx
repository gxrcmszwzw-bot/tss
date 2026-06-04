type Bar = {
  label: string;
  value: number;
};

type BarChartProps = {
  data: Bar[];
  title?: string;
  maxBars?: number;
};

export function BarChart({ data, title, maxBars = 10 }: BarChartProps) {
  const limited = data.slice(0, maxBars);
  const max = limited.reduce((m, b) => Math.max(m, b.value), 0);

  return (
    <div>
      {title ? <h3 className="mb-3 font-semibold text-foreground">{title}</h3> : null}
      {limited.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground/50">Veri yok</p>
      ) : (
        <ul className="space-y-2.5">
          {limited.map((bar) => {
            const pct = max === 0 ? 0 : (bar.value / max) * 100;
            return (
              <li key={bar.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate text-foreground/80">{bar.label}</span>
                  <span className="ml-3 font-semibold text-foreground">{bar.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-panel-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
