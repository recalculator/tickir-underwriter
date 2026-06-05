export function TickrLogo({ size = 32 }: { size?: number }) {
  // 4x4 dot grid, gray to green, with checkmark
  // dots[row][col] — 0=top-left (gray), increases toward bottom-right (green)
  const dots = [
    ["#d1d5d1", "#d1d5d1", "#d1d5d1", null],      // row 0: 3 gray, checkmark replaces 4th
    ["#d1d5d1", "#d1d5d1", "#86efac", "#22c55e"],  // row 1
    ["#d1d5d1", "#4ade80", "#22c55e", "#16a34a"],  // row 2
    ["#bbf7d0", "#4ade80", "#22c55e", "#16a34a"],  // row 3
  ];
  const spacing = size / 4;
  const r = size / 18;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {dots.map((row, ri) =>
        row.map((color, ci) =>
          color ? (
            <circle
              key={`${ri}-${ci}`}
              cx={spacing * ci + spacing / 2}
              cy={spacing * ri + spacing / 2}
              r={r}
              fill={color}
            />
          ) : null
        )
      )}
      {/* Checkmark in top-right */}
      <path
        d={`M ${size * 0.58} ${size * 0.18} L ${size * 0.72} ${size * 0.32} L ${size * 0.92} ${size * 0.08}`}
        stroke="#14532d"
        strokeWidth={size / 11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
