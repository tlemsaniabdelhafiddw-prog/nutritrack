'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BookOpen, CalendarDays, Camera, ChefHat, House, Menu, UserRound } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn } from '@/lib/cn';
import { Logo } from './logo';
import { Dialog } from '../ui/dialog';
import type { MessageKey } from '@/i18n/translate';

type Item = { href: string; label: MessageKey; icon: typeof House };

const PRIMARY: Item[] = [
  { href: '/dashboard', label: 'nav.home', icon: House },
  { href: '/diary', label: 'nav.diary', icon: BookOpen },
  { href: '/scan', label: 'nav.scan', icon: Camera },
  { href: '/recipes', label: 'nav.recipes', icon: ChefHat },
  { href: '/profile', label: 'nav.profile', icon: UserRound },
];

const SECONDARY: Item[] = [
  { href: '/planner', label: 'nav.planner', icon: CalendarDays },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

export function SideNav({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const path = usePathname();
  const items = [...PRIMARY.filter((i) => i.href !== '/scan'), ...SECONDARY];
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-paper/70 px-4 py-6 backdrop-blur lg:flex">
      <Link href={signedIn ? '/dashboard' : '/'} className="mb-8 px-2">
        <Logo className="h-8" priority />
      </Link>
      {signedIn && (
        <Link
          href="/scan"
          className="mb-6 flex items-center justify-center gap-2 rounded-full bg-rose-strong px-4 py-3 font-medium text-white shadow-lift transition-colors hover:bg-rose-ink"
        >
          <Camera className="h-5 w-5" aria-hidden />
          {t('dashboard.scanMeal')}
        </Link>
      )}
      <nav aria-label={t('nav.mainNavigation')} className="flex flex-col gap-1">
        {items
          .filter((i) => signedIn || i.href === '/recipes')
          .map((i) => {
            const active = isActive(path, i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] transition-colors',
                  active ? 'bg-rose-soft font-medium text-rose-ink' : 'text-ink-soft hover:bg-blush-deep hover:text-ink',
                )}
              >
                <i.icon className="h-5 w-5" aria-hidden />
                {t(i.label)}
              </Link>
            );
          })}
      </nav>
      {!signedIn && (
        <Link href="/auth" className="mt-auto rounded-full border border-line-strong px-4 py-2.5 text-center font-medium text-ink hover:border-rose">
          {t('common.signIn')}
        </Link>
      )}
    </aside>
  );
}

export function MobileTopBar({ signedIn }: { signedIn: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-blush/85 px-4 py-3 backdrop-blur lg:hidden">
      <Link href={signedIn ? '/dashboard' : '/'}>
        <Logo className="h-6" priority />
      </Link>
      {signedIn ? (
        <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 text-ink-soft hover:bg-blush-deep" aria-label={t('nav.mainNavigation')}>
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      ) : (
        <Link href="/auth" className="text-sm font-medium text-rose-ink">
          {t('common.signIn')}
        </Link>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={t('common.appName')} closeLabel={t('common.close')}>
        <nav className="flex flex-col gap-1 pb-2">
          {SECONDARY.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-ink hover:bg-blush-deep">
              <i.icon className="h-5 w-5 text-rose-ink" aria-hidden />
              {t(i.label)}
            </Link>
          ))}
        </nav>
      </Dialog>
    </header>
  );
}

export function BottomNav() {
  const t = useT();
  const path = usePathname();
  return (
    <nav
      aria-label={t('nav.mainNavigation')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
        {PRIMARY.map((i) => {
          const active = isActive(path, i.href);
          if (i.href === '/scan') {
            return (
              <li key={i.href} className="flex justify-center">
                <Link
                  href={i.href}
                  aria-current={active ? 'page' : undefined}
                  className="-mt-6 flex flex-col items-center gap-1 text-[0.7rem] font-medium text-rose-ink"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-rose-strong text-white shadow-lift ring-4 ring-paper">
                    <i.icon className="h-6 w-6" aria-hidden />
                  </span>
                  {t(i.label)}
                </Link>
              </li>
            );
          }
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex flex-col items-center gap-1 py-2.5 text-[0.7rem]', active ? 'font-semibold text-rose-ink' : 'text-ink-soft')}
              >
                <i.icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.4 : 1.8} />
                {t(i.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
