'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/i18n/client';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/field';
import { Notice } from '../ui/surface';
import { ChoiceGroup } from '../ui/choice';

type Mode = 'signin' | 'signup' | 'reset';

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export function AuthForm({ next, initialError }: { next: string | null; initialError?: string | null }) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }
    if (mode !== 'reset' && password.length < 8) {
      setError(t('auth.weakPassword'));
      return;
    }
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    const origin = window.location.origin;
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          setError(err.code === 'email_not_confirmed' ? t('auth.emailNotConfirmed') : err.status === 400 ? t('auth.invalidCredentials') : t('common.errorGeneric'));
          return;
        }
        router.replace(safeNext(next));
        router.refresh();
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` } });
        if (err) {
          setError(err.code === 'user_already_exists' ? t('auth.userExists') : err.code === 'weak_password' ? t('auth.weakPassword') : t('common.errorGeneric'));
          return;
        }
        if (data.session) {
          router.replace('/onboarding');
          router.refresh();
        } else setInfo(t('auth.checkEmail', { email }));
      } else {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/auth/update-password` });
        setInfo(t('auth.resetSent', { email }));
      }
    } catch {
      setError(t('common.errorNetwork'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {mode !== 'reset' ? (
        <ChoiceGroup<Mode>
          legend={t('auth.title')}
          hideLegend
          layout="segmented"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
            setInfo(null);
          }}
          options={[
            { value: 'signin', label: t('auth.signInTab') },
            { value: 'signup', label: t('auth.signUpTab') },
          ]}
        />
      ) : (
        <h2 className="font-display text-xl font-semibold">{t('auth.resetTitle')}</h2>
      )}

      <Field label={t('auth.email')}>
        {({ id }) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      {mode !== 'reset' && (
        <Field label={t('auth.password')} hint={mode === 'signup' ? t('auth.passwordHint') : undefined}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="password"
              aria-describedby={describedBy}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {info && <Notice tone="success">{info}</Notice>}

      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {mode === 'signin' ? t('auth.signInButton') : mode === 'signup' ? t('auth.signUpButton') : t('auth.resetButton')}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {mode === 'signin' && (
          <button type="button" className="text-rose-ink hover:underline" onClick={() => setMode('reset')}>
            {t('auth.forgot')}
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className="text-rose-ink hover:underline" onClick={() => setMode('signin')}>
            {t('common.back')}
          </button>
        )}
        {mode === 'signup' && (
          <p className="text-xs text-ink-soft">
            {t('auth.consentNote')}{' '}
            <Link href="/privacy" className="text-rose-ink underline">
              {t('auth.privacyLink')}
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}

export function UpdatePasswordForm() {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(t('auth.weakPassword'));
      return;
    }
    setBusy(true);
    const { error: err } = await getSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.code === 'weak_password' ? t('auth.weakPassword') : t('common.errorGeneric'));
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')}>
        {({ id, describedBy }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} value={password} onChange={(e) => setPassword(e.target.value)} />}
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {t('auth.updatePassword')}
      </Button>
    </form>
  );
}
