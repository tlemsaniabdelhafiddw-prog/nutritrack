import Link from 'next/link';
import { Logo } from '@/components/app/logo';

export const metadata = { title: 'Privacy' };

/** Plain-language privacy notice. Review with a legal adviser before a public launch. */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/">
        <Logo className="mb-8 h-7" />
      </Link>
      <h1 className="font-display text-3xl font-semibold">Privacy notice</h1>
      <p className="mt-2 text-sm text-ink-soft">Last updated 27 October 2026</p>
      <div className="mt-8 space-y-6 leading-relaxed">
        <section>
          <h2 className="font-display text-lg font-semibold">What we store</h2>
          <p className="mt-2">Your account email, the profile details you enter (name, date of birth, height, weight, activity, goal, food preferences and allergies), your meals, nutrition targets, weigh-ins, water logs, meal plans and favorites. Data is stored in Supabase (EU region) and protected so that only your account can read it.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold">Meal photos</h2>
          <p className="mt-2">When you analyze a photo, it is sent to Anthropic’s Claude API to identify foods. We ask for your consent before the first analysis. If you choose to keep a photo, it is stored in a private storage bucket that only you can access. You can delete individual photos, all photos, or all your data from your profile.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold">Your choices</h2>
          <p className="mt-2">From your profile you can download a copy of your data, withdraw photo-analysis consent, delete your nutrition data, or delete your account permanently.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold">Health information</h2>
          <p className="mt-2">NutriTrack provides general wellness estimates, not medical advice. Nutrition values are estimates.</p>
        </section>
      </div>
    </div>
  );
}
