import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The calorie "plate": a thick rose ring on a blush rim. The ring stops at 100%;
 * anything over target shows as a thin wheat arc layered on top.
 */
export function PlateRing({
  value,
  target,
  size = 220,
  children,
  label,
}: {
  value: number;
  target: number | null;
  size?: number;
  children?: ReactNode;
  label: string;
}) {
  const stroke = size * 0.085;
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  const ratio = target && target > 0 ? value / target : 0;
  const main = Math.min(ratio, 1);
  const over = target ? Math.min(Math.max(ratio - 1, 0), 1) : 0;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="-rotate-90 rtl:scale-x-[-1]">
        {/* plate rim */}
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="var(--color-paper)" stroke="var(--color-line)" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-blush-deep)" strokeWidth={stroke} />
        {target ? (
          <circle
            className="ring-animate"
            style={{ ['--ring-full' as string]: c }}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-rose)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - main)}
          />
        ) : null}
        {over > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-wheat)"
            strokeWidth={stroke * 0.42}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - over)}
          />
        )}
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 - 10} fill="none" stroke="var(--color-line)" strokeDasharray="2 6" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

const macroColors = {
  protein: { bar: 'bg-protein', text: 'text-rose-ink' },
  carbs: { bar: 'bg-carbs', text: 'text-wheat-ink' },
  fat: { bar: 'bg-fat', text: 'text-ink' },
  fiber: { bar: 'bg-leaf', text: 'text-leaf-ink' },
} as const;

export type MacroKind = keyof typeof macroColors;

export function MacroBar({ kind, label, value, target, unit }: { kind: MacroKind; label: string; value: number; target: number | null; unit: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular ltr-nums text-ink-soft">
          <span className={cn('font-semibold', macroColors[kind].text)}>{Math.round(value)}</span>
          {target ? ` / ${Math.round(target)}` : ''} {unit}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-blush-deep"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target ? Math.round(target) : undefined}
        aria-valuenow={Math.round(value)}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-700', macroColors[kind].bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Small inline macro summary: P · C · F with colored dots. */
export function MacroDots({ p, c, f, labels }: { p: number; c: number; f: number; labels: { protein: string; carbs: string; fat: string } }) {
  const item = (dot: string, label: string, v: number) => (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      <span className="sr-only">{label}</span>
      <span className="tabular ltr-nums">{Math.round(v)}g</span>
    </span>
  );
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
      {item('bg-protein', labels.protein, p)}
      {item('bg-carbs', labels.carbs, c)}
      {item('bg-fat', labels.fat, f)}
    </span>
  );
}
