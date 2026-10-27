'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Option<V extends string> = { value: V; label: ReactNode; hint?: ReactNode };

/** Radio group styled as selectable tiles or a compact segmented control. */
export function ChoiceGroup<V extends string>({
  legend,
  options,
  value,
  onChange,
  layout = 'tiles',
  className,
  hideLegend,
}: {
  legend: ReactNode;
  options: Option<V>[];
  value: V | null;
  onChange: (v: V) => void;
  layout?: 'tiles' | 'segmented';
  className?: string;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      <legend className={cn('mb-1.5 text-sm font-medium text-ink', hideLegend && 'sr-only')}>{legend}</legend>
      <div className={layout === 'segmented' ? 'inline-flex w-full rounded-full border border-line-strong bg-paper p-1' : 'grid gap-2 sm:grid-cols-2'}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                'relative cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rose-strong',
                layout === 'segmented'
                  ? cn('flex-1 rounded-full px-3 py-2 text-center text-sm transition-colors', checked ? 'bg-rose-strong text-white' : 'text-ink-soft hover:text-ink')
                  : cn(
                      'flex flex-col gap-0.5 rounded-[var(--radius-field)] border bg-paper px-4 py-3 transition-colors',
                      checked ? 'border-rose-strong bg-rose-soft/40 shadow-soft' : 'border-line-strong hover:border-rose',
                    ),
              )}
            >
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span className={cn(layout === 'tiles' && 'font-medium text-ink')}>{o.label}</span>
              {o.hint && layout === 'tiles' && <span className="text-xs text-ink-soft">{o.hint}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Multi-select chips (checkboxes). */
export function ChipGroup<V extends string>({
  legend,
  options,
  values,
  onChange,
}: {
  legend: ReactNode;
  options: { value: V; label: ReactNode }[];
  values: V[];
  onChange: (v: V[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rose-strong',
                on ? 'border-leaf-ink bg-leaf-soft text-leaf-ink' : 'border-line-strong bg-paper text-ink-soft hover:text-ink',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
