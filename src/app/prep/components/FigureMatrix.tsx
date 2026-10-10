import { COLORS, SIZE, type Frame, type Shape } from "@/lib/prep/figures";

const CELL = 26;

const SHAPES: Record<Shape, React.ReactNode> = {
  triangle: <path d="M0,-8 L7.5,6.5 L-7.5,6.5 Z" />,
  arrow: <path d="M0,-9.5 L7.5,-1 L3,-1 L3,8.5 L-3,8.5 L-3,-1 L-7.5,-1 Z" />,
  half: <path d="M-8.5,3 A8.5,8.5 0 0 1 8.5,3 Z" />,
  circle: <circle r="7.5" />,
  square: <rect x="-6.5" y="-6.5" width="13" height="13" rx="1.5" />,
};

/** One matrix of the Figure Sequences task: a 4×4 grid with coloured, possibly rotated figures. */
export function FigureMatrix({ frame, label, highlight, className = "" }: { frame: Frame | null; label?: string; highlight?: boolean; className?: string }) {
  const size = SIZE * CELL;
  return (
    <svg
      viewBox={`-3 -3 ${size + 6} ${size + 6}`}
      className={`aspect-square rounded-lg bg-surface ${highlight ? "ring-2 ring-accent-bright" : "ring-1 ring-border"} ${className}`}
      role="img"
      aria-label={label ?? "matrix"}
    >
      {Array.from({ length: SIZE + 1 }, (_, i) => (
        <g key={i} stroke="var(--border)" strokeWidth="1">
          <line x1={i * CELL} y1={0} x2={i * CELL} y2={size} />
          <line x1={0} y1={i * CELL} x2={size} y2={i * CELL} />
        </g>
      ))}
      {frame ? (
        frame.map((s, i) => (
          <g key={i} transform={`translate(${s.c * CELL + CELL / 2} ${s.r * CELL + CELL / 2}) rotate(${s.rot * 90})`} fill={COLORS[s.color]}>
            {SHAPES[s.shape]}
          </g>
        ))
      ) : (
        <text x={size / 2} y={size / 2 + 10} textAnchor="middle" className="fill-muted font-display text-[32px]">
          ?
        </text>
      )}
    </svg>
  );
}
