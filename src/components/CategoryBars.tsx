import { CATEGORY_COLORS } from '../domain/categories';
import type { Category } from '../domain/categories';
import { categoryTag, DISPLAY_CATEGORIES, money, shortMoney } from '../domain/presentation';
export function CategoryBars({
  totals,
  limits,
}: {
  totals: Record<Category, number>;
  limits: Partial<Record<Category, number>>;
}) {
  return (
    <div className="category-bars">
      {DISPLAY_CATEGORIES.map((category) => (
        <div key={category}>
          <div className="category-line">
            <span style={{ color: CATEGORY_COLORS[category] }}>#{categoryTag(category)}</span>
            <span>
              {money(totals[category])}{' '}
              <span className="muted">
                / {limits[category] ? shortMoney(limits[category]) : '—'}
              </span>
            </span>
          </div>
          <div className="track">
            <span
              style={{
                width: `${limits[category] ? Math.min(100, (totals[category] / limits[category]) * 100) : 0}%`,
                background: CATEGORY_COLORS[category],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
