import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { Insight } from '@/lib/insights';
import type { Translator } from '@/i18n/translate';

export function InsightList({ insights, t }: { insights: Insight[]; t: Translator }) {
  return (
    <div>
      <ul className="space-y-3">
        {insights.map((i) => (
          <li key={i.key} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink">
            <Sparkles className="mt-1 h-4 w-4 shrink-0 text-leaf-ink" aria-hidden />
            <span>
              {'params' in i ? t(`insight.${i.key}`, i.params) : t(`insight.${i.key}`)}
              {i.key === 'fiber_low_suggest_veg' && (
                <>
                  {' '}
                  <Link href="/recipes?diet=high_fiber" className="font-medium text-rose-ink underline underline-offset-2">
                    {t('insight.seeRecipes')}
                  </Link>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-soft">{t('insight.disclaimer')}</p>
    </div>
  );
}
