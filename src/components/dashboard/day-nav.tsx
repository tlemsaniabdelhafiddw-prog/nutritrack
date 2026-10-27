import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '@/lib/dates';
import type { Translator } from '@/i18n/translate';

/** Previous/next day links. Chevrons flip automatically in RTL. */
export function DayNav({ date, today, basePath, t }: { date: string; today: string; basePath: string; t: Translator }) {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const label =
    date === today ? t('common.today') : date === addDays(today, -1) ? t('common.yesterday') : t.date(date, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-paper p-1 shadow-soft">
      <Link href={`${basePath}?date=${prev}`} className="rounded-full p-1.5 text-ink-soft hover:bg-blush-deep hover:text-ink" aria-label={t('common.previousDay')}>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </Link>
      <span className="min-w-28 px-1 text-center text-sm font-medium text-ink">{label}</span>
      {date < today ? (
        <Link href={next === today ? basePath : `${basePath}?date=${next}`} className="rounded-full p-1.5 text-ink-soft hover:bg-blush-deep hover:text-ink" aria-label={t('common.nextDay')}>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      ) : (
        <span className="p-1.5 text-line-strong" aria-hidden>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </span>
      )}
    </div>
  );
}
