type Slice = {
  label: string;
  value: number;
  color?: string;
};

type PieChartProps = {
  data: Slice[];
  size?: number;
  title?: string;
};

const PALETTE = [
  "#C62828", // accent
  "#F57F17", // warning
  "#2E7D32", // success
  "#1565C0", // blue
  "#6A1B9A", // purple
  "#EF6C00", // orange
  "#00838F", // teal
  "#5D4037", // brown
  "#455A64", // blue-grey
  "#D81B60", // pink
];

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
}

export function PieChart({ data, size = 180, title }: PieChartProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-sm text-foreground/50">
        {title ? <p className="mb-2 font-semibold text-foreground/70">{title}</p> : null}
        Veri yok
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const innerR = r - size / 4.5;

  // Compute cumulative offsets up front (no mutation during render)
  const offsets = data.reduce<number[]>((acc, slice) => {
    const previous = acc.length === 0 ? 0 : acc[acc.length - 1];
    return [...acc, previous + slice.value / total];
  }, []);

  const segments = data.map((slice, index) => {
    const startFraction = index === 0 ? 0 : offsets[index - 1];
    const endFraction = offsets[index];
    const startAngle = startFraction * 2 * Math.PI - Math.PI / 2;
    const endAngle = endFraction * 2 * Math.PI - Math.PI / 2;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const color = slice.color ?? PALETTE[index % PALETTE.length];

    if (data.length === 1) {
      // Donut as outer + inner filled circles (avoids stroke clipping at viewBox edges)
      return (
        <g key={slice.label}>
          <circle cx={cx} cy={cy} fill={color} r={r} />
          <circle cx={cx} cy={cy} fill="var(--panel)" r={innerR} />
        </g>
      );
    }

    const [x1, y1] = polar(cx, cy, r, startAngle);
    const [x2, y2] = polar(cx, cy, r, endAngle);
    const [x3, y3] = polar(cx, cy, innerR, endAngle);
    const [x4, y4] = polar(cx, cy, innerR, startAngle);

    const path = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");

    return <path d={path} fill={color} key={slice.label} />;
  });

  return (
    <div>
      {title ? <h3 className="mb-3 font-semibold text-foreground">{title}</h3> : null}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <svg
          aria-hidden="true"
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          className="shrink-0"
        >
          {segments}
          <text
            dominantBaseline="middle"
            textAnchor="middle"
            x={cx}
            y={cy - 6}
            className="fill-foreground"
            fontSize={Math.round(size / 7)}
            fontWeight="700"
          >
            {total}
          </text>
          <text
            dominantBaseline="middle"
            textAnchor="middle"
            x={cx}
            y={cy + 14}
            className="fill-foreground/50"
            fontSize={11}
          >
            toplam
          </text>
        </svg>
        <ul className="flex-1 space-y-1.5 text-sm">
          {data.map((slice, index) => {
            const color = slice.color ?? PALETTE[index % PALETTE.length];
            const pct = total === 0 ? 0 : Math.round((slice.value / total) * 100);
            return (
              <li className="flex items-center gap-2" key={slice.label}>
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1 truncate text-foreground/80">{slice.label}</span>
                <span className="shrink-0 text-xs text-foreground/55">
                  {slice.value} <span className="text-foreground/35">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
