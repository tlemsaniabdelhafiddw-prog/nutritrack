import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '../app/logo';
import { LanguageSwitcher } from '../app/language-switcher';

/** Split layout: form on one side, a single food photograph on the other (desktop only). */
export function AuthLayout({ children, photoCredit }: { children: ReactNode; photoCredit: string }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,46%)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Logo className="h-7" priority />
          </Link>
          <LanguageSwitcher />
        </div>
        <main id="content" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
      <div className="relative hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=75"
          alt=""
          fill
          sizes="46vw"
          className="object-cover"
          priority
        />
        <p className="absolute bottom-4 end-4 rounded-full bg-ink/55 px-3 py-1 text-xs text-white">{photoCredit}</p>
      </div>
    </div>
  );
}
