'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, LogOut, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, errorMessage } from '@/lib/client/api';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config';
import { Button } from '../ui/button';
import { Field, Input, Select } from '../ui/field';
import { Card, Notice } from '../ui/surface';
import { useToast } from '../ui/toast';

type ProfilePayload = Record<string, unknown> & { locale: Locale };

export function ProfileSettings({ profile, consentAt }: { profile: ProfilePayload; consentAt: string | null }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(profile.locale);
  const [saving, setSaving] = useState(false);

  async function saveLocale(next: Locale) {
    setLocale(next);
    setSaving(true);
    try {
      await api('/api/profile', { method: 'PATCH', json: { profile: { ...profile, locale: next } } });
      toast({ tone: 'success', message: t('profile.profileSaved') });
      router.refresh();
    } catch (err) {
      toast({ tone: 'error', message: errorMessage(t, err) });
    } finally {
      setSaving(false);
    }
  }

  async function withdraw() {
    try {
      await api('/api/consent', { method: 'DELETE' });
      toast({ tone: 'success', message: t('profile.consentWithdrawn') });
      router.refresh();
    } catch (err) {
      toast({ tone: 'error', message: errorMessage(t, err) });
    }
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">{t('profile.settings')}</h2>
        <Field label={t('profile.language')}>
          {({ id }) => (
            <Select id={id} value={locale} disabled={saving} onChange={(e) => saveLocale(e.target.value as Locale)}>
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_NAMES[l]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div>
          <p className="text-sm font-medium">{t('profile.aiConsent')}</p>
          <p className="mt-1 text-sm text-ink-soft">{consentAt ? t('profile.aiConsentGiven', { date: t.date(consentAt, { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('profile.aiConsentNone')}</p>
          {consentAt && (
            <Button variant="ghost" size="sm" className="mt-1 -ms-3" onClick={withdraw}>
              {t('profile.withdrawConsent')}
            </Button>
          )}
        </div>
        <Button variant="secondary" onClick={signOut}>
          <LogOut className="h-4 w-4" aria-hidden />
          {t('common.signOut')}
        </Button>
      </Card>
      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const [action, setAction] = useState<'data' | 'account' | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (typed !== 'DELETE' || !action) return;
    setBusy(true);
    setError(null);
    try {
      await api(action === 'data' ? '/api/account/data' : '/api/account', { method: 'DELETE', json: { confirm: 'DELETE' } });
      if (action === 'account') {
        await getSupabaseBrowserClient().auth.signOut();
        router.replace('/');
      } else {
        toast({ tone: 'success', message: t('profile.dataDeleted') });
        setAction(null);
        setTyped('');
      }
      router.refresh();
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">{t('profile.privacy')}</h2>
      <div className="flex flex-wrap gap-2">
        <a href="/api/account/export" className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-paper px-3.5 text-sm hover:border-rose">
          <Download className="h-4 w-4" aria-hidden />
          {t('profile.exportData')}
        </a>
        <Button variant="secondary" size="sm" onClick={() => setAction('data')}>
          {t('profile.deleteData')}
        </Button>
        <Button variant="secondary" size="sm" className="text-danger" onClick={() => setAction('account')}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {t('profile.deleteAccount')}
        </Button>
      </div>
      {action && (
        <div className="space-y-3 rounded-2xl border border-danger/30 bg-danger-soft/40 p-4">
          <p className="text-sm">{action === 'data' ? t('profile.deleteDataConfirm') : t('profile.deleteAccountConfirm')}</p>
          <Field label={t('profile.typeDelete')}>{({ id }) => <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />}</Field>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setAction(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" disabled={typed !== 'DELETE'} loading={busy} onClick={confirm}>
              {action === 'data' ? t('profile.deleteData') : t('profile.deleteAccount')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
