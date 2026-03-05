import type { HealthSnapshot } from '../../hooks/useHealthHistory';

interface HealthSparklineProps {
  snapshots: HealthSnapshot[];
  trend: 'up' | 'down' | 'stable';
  delta: number;
  width?: number;
  height?: number;
}

export function HealthSparkline({ snapshots, trend, delta, width = 60, height = 20 }: HealthSparklineProps) {
  if (snapshots.length < 2) return null;

  const scores = snapshots.map(s => s.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(max - min, 10); // ensure some visual variance

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = scores
    .map((score, i) => {
      const x = pad + (i / (scores.length - 1)) * w;
      const y = pad + h - ((score - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const trendColor =
    trend === 'up' ? '#10b981' :
    trend === 'down' ? '#ef4444' :
    '#6b7280';

  const trendIcon =
    trend === 'up' ? '↑' :
    trend === 'down' ? '↓' :
    '→';

  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;

  return (
    <div className="flex items-center gap-1.5" title={`Health trend: ${deltaStr} pts over ${snapshots.length} readings`}>
      <svg width={width} height={height} className="flex-shrink-0">
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        {/* Last point dot */}
        {(() => {
          const last = scores[scores.length - 1];
          const x = pad + w;
          const y = pad + h - ((last - min) / range) * h;
          return <circle cx={x} cy={y} r="2" fill={trendColor} />;
        })()}
      </svg>
      <span
        className="text-xs font-bold flex-shrink-0"
        style={{ color: trendColor }}
      >
        {trendIcon}{Math.abs(delta) > 0 ? Math.abs(delta) : ''}
      </span>
    </div>
  );
}
