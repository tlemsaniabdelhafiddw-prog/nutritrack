import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Camera, ChefHat, ShieldCheck, Target } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/server';
import { getT } from '@/i18n/server';
import { Logo } from '@/components/app/logo';
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { ButtonLink } from '@/components/ui/button';

export default async function LandingPage() {
  const { user } = await getCurrentUser();
  if (user) redirect('/dashboard');
  const t = await getT();

  const steps = [
    { icon: Target, title: t('landing.step1Title'), body: t('landing.step1Body') },
    { icon: Camera, title: t('landing.step2Title'), body: t('landing.step2Body') },
    { icon: ChefHat, title: t('landing.step3Title'), body: t('landing.step3Body') },
  ];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo className="h-7 sm:h-8" priority />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/auth" className="hidden text-sm font-medium text-ink hover:text-rose-ink sm:inline">
            {t('common.signIn')}
          </Link>
        </div>
      </header>

      <main id="content">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-6 pb-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-12">
          <div>
            <h1 className="font-display text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-ink sm:text-[3.6rem]">{t('landing.title')}</h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft">{t('landing.lead')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/auth" size="lg">
                {t('landing.ctaStart')}
              </ButtonLink>
              <ButtonLink href="/recipes" variant="secondary" size="lg">
                {t('landing.ctaRecipes')}
              </ButtonLink>
            </div>
          </div>

          <figure className="relative">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] shadow-lift">
              <Image
                src="https://images.unsplash.com/photo-1739217744880-472f59559cc5?auto=format&fit=crop&w=1400&q=75"
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            </div>
            {/* A worked example of a scan result, drawn over the photo. */}
            <div className="absolute -bottom-6 start-4 w-[min(20rem,85%)] rounded-3xl border border-line bg-paper/95 p-4 shadow-lift backdrop-blur sm:start-8">
              <p className="text-xs font-medium text-ink-soft">{t('scan.reviewTitle')}</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li className="flex justify-between gap-3">
                  <span>{t('landing.sampleItem1')}</span>
                  <span className="tabular text-ink-soft">~180 g · 202 {t('common.kcal')}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>{t('landing.sampleItem2')}</span>
                  <span className="tabular text-ink-soft">~150 g · 96 {t('common.kcal')}</span>
                </li>
                <li className="flex items-center justify-between gap-3 text-wheat-ink">
                  <span>{t('landing.sampleQuestion')}</span>
                  <span className="text-xs">{t('scan.confidence', { level: t('scan.confidence_low') })}</span>
                </li>
              </ul>
            </div>
            <figcaption className="mt-10 text-end text-xs text-ink-faint">{t('landing.photoCredit', { name: 'Mourad Harkat' })}</figcaption>
          </figure>
        </section>

        <section className="border-y border-line bg-paper/60">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
            <h2 className="font-display text-2xl font-semibold">{t('landing.stepsTitle')}</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="font-display text-3xl font-semibold text-rose tabular" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 font-medium text-ink">
                      <s.icon className="h-4 w-4 text-leaf-ink" aria-hidden />
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-ink-soft">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold">{t('landing.honestTitle')}</h2>
            <p className="mt-3 text-ink-soft">{t('landing.honestBody')}</p>
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
              <ShieldCheck className="h-6 w-6 text-leaf-ink" aria-hidden />
              {t('landing.privacyTitle')}
            </h2>
            <p className="mt-3 text-ink-soft">{t('landing.privacyBody')}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-soft sm:px-8">
          <p className="max-w-xl text-xs">{t('common.medicalDisclaimer')}</p>
          <Link href="/privacy" className="hover:text-ink">
            {t('landing.footerPrivacy')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
