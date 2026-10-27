import type { DailyTotal } from '@/lib/server/diary';
import type { Translator } from '@/i18n/translate';
import { cn } from '@/lib/cn';

/** Seven vertical bars, one per day, with the calorie target drawn as a dashed line. */
export function WeekBars({ days, target, today, t }: { days: DailyTotal[]; target: number | null; today: string; t: Translator }) {
  const max = Math.max(target ?? 0, ...days.map((d) => d.kcal), 1) * 1.1;
  const h = 96;
  return (
    <figure>
      <div className="relative flex h-24 items-end gap-2" role="img" aria-label={days.map((d) => `${t.date(d.date, { weekday: 'short' })}: ${d.kcal} ${t('common.kcal')}`).join(', ')}>
        {target ? <div className="absolute inset-x-0 border-t border-dashed border-rose/60" style={{ bottom: (target / max) * h }} aria-hidden /> : null}
        {days.map((d) => (
          <div key={d.date} className="flex h-full flex-1 flex-col justify-end">
            <div
              className={cn('w-full rounded-t-md', d.meals === 0 ? 'bg-line' : d.date === today ? 'bg-rose' : 'bg-rose/45')}
              style={{ height: d.meals === 0 ? 3 : Math.max(4, (d.kcal / max) * h) }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-1.5 flex gap-2 text-center text-[0.7rem] text-ink-soft" aria-hidden>
        {days.map((d) => (
          <span key={d.date} className={cn('flex-1', d.date === today && 'font-semibold text-ink')}>
            {t.date(d.date, { weekday: 'narrow' })}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Weight sparkline over the recorded entries (no interpolation beyond the data). */
export function WeightSpark({ entries, unitLabel, toDisplay, t }: { entries: { measured_on: string; weight_kg: number }[]; unitLabel: string; toDisplay: (kg: number) => number; t: Translator }) {
  const w = 280;
  const h = 64;
  const vals = entries.map((e) => toDisplay(e.weight_kg));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pts = vals.map((v, i) => [entries.length === 1 ? w / 2 : (i / (entries.length - 1)) * (w - 8) + 4, h - 6 - ((v - min) / span) * (h - 12)]);
  const last = vals[vals.length - 1];
  return (
    <div>
      <p className="font-display text-2xl font-semibold tabular text-ink">
        {t.num(last, 1)} <span className="text-sm font-normal text-ink-soft">{unitLabel}</span>
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-16 w-full rtl:scale-x-[-1]" aria-hidden preserveAspectRatio="none">
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-leaf-ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--color-paper)" stroke="var(--color-leaf-ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <p className="mt-1 text-xs text-ink-soft">
        {t.date(entries[0].measured_on)} – {t.date(entries[entries.length - 1].measured_on)}
      </p>
    </div>
  );
}
