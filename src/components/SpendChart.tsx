import { money, shortMoney } from '../domain/presentation';
import type { monthInsights } from '../domain/insights';
export function SpendChart({
  insights,
  limit,
  compact = false,
}: {
  insights: ReturnType<typeof monthInsights>;
  limit: number | null;
  compact?: boolean;
}) {
  const max = Math.max(limit ?? 0, insights.forecastMinor, insights.totalMinor, 100);
  const x = (day: number) => 50 + (day / insights.days) * 650;
  const y = (amount: number) => 192 - (amount / max) * 150;
  const points = insights.actualPoints.map((amount, day) => `${x(day)},${y(amount)}`);
  const last = insights.actualPoints[insights.actualPoints.length - 1];
  const lastX = x(insights.elapsedDays);
  return (
    <svg
      className={`spend-chart ${compact ? 'compact' : ''}`}
      viewBox="0 0 740 230"
      role="img"
      aria-label={`Cumulative spending ${money(last)}; month-end estimate ${money(insights.forecastMinor)}${limit === null ? '' : `; limit ${money(limit)}`}`}
    >
      {!compact &&
        [0, 0.25, 0.5, 0.75].map((fraction) => (
          <g key={fraction}>
            <line
              x1="50"
              x2="700"
              y1={y(max * fraction)}
              y2={y(max * fraction)}
              className="chart-grid"
            />
            <text x="42" y={y(max * fraction) + 4} textAnchor="end">
              {shortMoney(Math.round(max * fraction))}
            </text>
          </g>
        ))}
      {limit !== null && (
        <>
          <line x1="50" x2="700" y1={y(limit)} y2={y(limit)} className="chart-limit" />
          <path
            d={`M50,${y(insights.monthFixedMinor)} L700,${y(Math.max(limit, insights.monthFixedMinor))}`}
            className="chart-pace"
          />
          {!compact && (
            <text x="700" y={y(limit) - 9} textAnchor="end">
              limit {shortMoney(limit)}
            </text>
          )}
        </>
      )}
      <path d={`M${points.join(' L')} L${lastX},192 L50,192 Z`} className="chart-area" />
      <path d={`M${points.join(' L')}`} className="chart-actual" />
      <path
        d={`M${lastX},${y(last)} L700,${y(insights.forecastMinor)}`}
        className="chart-forecast"
      />
      <circle cx={lastX} cy={y(last)} r="4.5" className="chart-point" />
      {!compact && (
        <>
          <text
            x={Math.max(95, Math.min(650, lastX))}
            y={y(last) + 21}
            textAnchor="middle"
            className="chart-value"
          >
            {money(last)}
          </text>
          {[1, 5, 10, 15, 20, 25, insights.days].map((day) => (
            <text key={day} x={x(day)} y="222" textAnchor="middle">
              {String(day).padStart(2, '0')}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}
