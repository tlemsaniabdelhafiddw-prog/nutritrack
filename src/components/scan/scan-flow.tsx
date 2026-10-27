'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, CircleHelp, Droplet, ImageUp, Info, LoaderCircle, Plus, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useT } from '@/i18n/client';
import { api, ClientApiError, errorMessage, newRequestId } from '@/lib/client/api';
import { prepareImage, ImageError, type PreparedImage } from '@/lib/client/image';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MealAnalysis } from '@/lib/ai/schema';
import type { ReviewItem } from '@/lib/server/food-matching';
import { Button, ButtonLink } from '../ui/button';
import { Card, Notice, Skeleton } from '../ui/surface';
import { ChoiceGroup } from '../ui/choice';
import { Field, Input } from '../ui/field';
import { useToast } from '../ui/toast';
import { CameraDialog } from './camera-dialog';
import { MealEditor, itemFromFood, newKey, type EditorItem, type MealMeta } from '../meals/meal-editor';
import { autoName, toPayloadItems } from '../meals/meal-form-dialog';
import type { Food } from '../food/food-search';

type Context = 'homemade' | 'restaurant' | 'packaged';
type AnalyzeResponse = { analysis: MealAnalysis; items: ReviewItem[]; provider: string; model: string };

type Props = {
  userId: string;
  aiConfigured: boolean;
  hasConsent: boolean;
  keepPhotosDefault: boolean;
  defaults: { date: string; time: string; category: MealMeta['category'] };
};

function toEditorItem(r: ReviewItem, locale: string): EditorItem {
  const db = r.match;
  const dbName = db ? (locale === 'fr' && db.name_fr) || (locale === 'ar' && db.name_ar) || db.name : null;
  return {
    key: newKey(),
    name: r.name,
    grams: String(r.grams),
    food_id: db?.food_id ?? null,
    nutrient_source: db ? 'database' : 'ai_estimate',
    per100: db ? db.per100 : r.ai.per100,
    serving: db?.serving_grams ? { unit: db.serving_unit ?? 'serving', grams: db.serving_grams } : null,
    scan: {
      identification_confidence: r.identification_confidence,
      portion_confidence: r.portion_confidence,
      notes: r.notes,
      energy_mismatch: r.energy_mismatch,
      aiPer100: r.ai.per100,
      dbFood: db ? { id: db.food_id, name: dbName!, source: db.source, per100: db.per100 } : null,
    },
  };
}

export function ScanFlow({ userId, aiConfigured, hasConsent, keepPhotosDefault, defaults }: Props) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const captureInput = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<PreparedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [context, setContext] = useState<Context>('homemade');
  const [hint, setHint] = useState('');
  const [consent, setConsent] = useState(hasConsent);
  const [consentChecked, setConsentChecked] = useState(false);

  const [step, setStep] = useState<'capture' | 'analyzing' | 'review'>('capture');
  const [slow, setSlow] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [items, setItems] = useState<EditorItem[]>([]);
  const [meta, setMeta] = useState<MealMeta>({ name: '', ...defaults });
  const [keepPhoto, setKeepPhoto] = useState(keepPhotosDefault);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const requestId = useRef(newRequestId());
  const uploadedPath = useRef<string | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setImageError(null);
    setAnalyzeError(null);
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      setImage(prepared);
      uploadedPath.current = null;
    } catch (err) {
      const code = err instanceof ImageError ? err.code : 'decode';
      setImageError(code === 'too_large' ? t('scan.fileTooLarge') : code === 'type' ? t('scan.fileType') : t('scan.decodeFailed'));
    } finally {
      setPreparing(false);
    }
  }

  function openCamera() {
    const canStream = typeof navigator !== 'undefined' && 'mediaDevices' in navigator && typeof navigator.mediaDevices.getUserMedia === 'function';
    // Touch devices get the native camera app; desktops get a live preview.
    if (canStream && window.matchMedia('(pointer: fine)').matches) setCameraOpen(true);
    else captureInput.current?.click();
  }

  async function analyze() {
    if (!image) return;
    if (!consent) {
      if (!consentChecked) {
        setAnalyzeError({ message: t('scan.consentRequired'), retryable: false });
        return;
      }
      try {
        await api('/api/consent', { method: 'POST' });
        setConsent(true);
      } catch (err) {
        setAnalyzeError({ message: errorMessage(t, err), retryable: true });
        return;
      }
    }
    setStep('analyzing');
    setAnalyzeError(null);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 12000);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const form = new FormData();
    form.append('image', image.blob, 'meal.jpg');
    form.append('context', context);
    form.append('hint', hint.trim());
    try {
      const res = await api<AnalyzeResponse>('/api/analyze', { form, signal: ctrl.signal });
      const editorItems = res.items.map((r) => toEditorItem(r, t.locale));
      setAnalysis(res.analysis);
      setItems(editorItems);
      setMeta((m) => ({ ...m, name: (res.analysis.meal_description || autoName(editorItems, t(`meal.${m.category}`))).slice(0, 120) }));
      setStep('review');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const retryable = err instanceof ClientApiError ? !['ai_not_configured', 'ai_not_food', 'consent_required', 'rate_limited', 'unsupported_media_type', 'payload_too_large'].includes(err.code) : true;
      const message = err instanceof ClientApiError && err.code === 'rate_limited' ? t('scan.rateLimited') : errorMessage(t, err);
      setAnalyzeError({ message, retryable });
      setStep('capture');
    } finally {
      clearTimeout(slowTimer);
    }
  }

  async function addFromSearch(term: string) {
    try {
      const { foods } = await api<{ foods: Food[] }>(`/api/foods/search?q=${encodeURIComponent(term)}`);
      if (!foods.length) {
        toast({ tone: 'error', message: t('foodSearch.noResults', { query: term }) });
        return;
      }
      setItems((cur) => [...cur, itemFromFood(foods[0], t.locale)]);
    } catch (err) {
      toast({ tone: 'error', message: errorMessage(t, err) });
    }
  }

  async function save() {
    if (!image || !analysis) return;
    setSaving(true);
    setSaveError(null);
    let photoPath: string | null = null;
    if (keepPhoto) {
      if (uploadedPath.current) photoPath = uploadedPath.current;
      else {
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error } = await getSupabaseBrowserClient().storage.from('meal-photos').upload(path, image.blob, { contentType: 'image/jpeg', upsert: false });
        if (error) toast({ tone: 'error', message: t('scan.photoUploadFailed') });
        else photoPath = uploadedPath.current = path;
      }
    }
    try {
      const res = await api<{ id: string; local_date: string }>('/api/meals', {
        json: {
          client_request_id: requestId.current,
          ...meta,
          name: meta.name.trim(),
          source: 'scan',
          items: toPayloadItems(items),
          photo_path: photoPath,
          analysis,
        },
      });
      toast({ tone: 'success', message: t('scan.saved') });
      router.push(`/dashboard?date=${res.local_date}`);
      router.refresh();
    } catch (err) {
      setSaveError(`${t('scan.saveFailed')} ${errorMessage(t, err)}`);
      setSaving(false);
    }
  }

  function startOver() {
    if (uploadedPath.current) void getSupabaseBrowserClient().storage.from('meal-photos').remove([uploadedPath.current]);
    uploadedPath.current = null;
    requestId.current = newRequestId();
    setImage(null);
    setItems([]);
    setAnalysis(null);
    setStep('capture');
  }

  if (!aiConfigured) {
    return (
      <Card className="p-6">
        <Notice tone="info" icon={<Info className="h-4 w-4" />}>
          {t('scan.notConfigured')}
        </Notice>
        <ButtonLink href={`/diary?date=${defaults.date}&add=1`} className="mt-4">
          <Plus className="h-4 w-4" aria-hidden />
          {t('scan.addManuallyInstead')}
        </ButtonLink>
      </Card>
    );
  }

  if (step === 'review' && analysis && image) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          <img src={image.url} alt={analysis.meal_description} className="aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover shadow-soft" />
          <Card className="space-y-3 p-4 text-sm">
            <h2 className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-rose-ink" aria-hidden />
              {t('scan.uncertainty')}
            </h2>
            <p className="text-ink-soft">{analysis.uncertainty_notice}</p>
            <p className="text-xs text-ink-faint">{t('scan.confidence', { level: t(`scan.confidence_${analysis.overall_confidence}`) })}</p>
          </Card>
          {analysis.hidden_ingredients.length > 0 && (
            <Card className="p-4 text-sm">
              <h2 className="mb-2 flex items-center gap-2 font-medium">
                <Droplet className="h-4 w-4 text-wheat-ink" aria-hidden />
                {t('scan.hiddenTitle')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {analysis.hidden_ingredients.map((h) => (
                  <button key={h} type="button" onClick={() => addFromSearch(h)} className="rounded-full border border-line-strong px-3 py-1 text-xs hover:border-rose hover:text-rose-ink">
                    + {h}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {analysis.clarifying_questions.length > 0 && (
            <Card className="p-4 text-sm">
              <h2 className="mb-2 flex items-center gap-2 font-medium">
                <CircleHelp className="h-4 w-4 text-leaf-ink" aria-hidden />
                {t('scan.questionsTitle')}
              </h2>
              <ul className="list-disc space-y-1 ps-5 text-ink-soft">
                {analysis.clarifying_questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>

        <div>
          <h2 className="font-display text-xl font-semibold">{t('scan.reviewTitle')}</h2>
          <p className="mb-4 text-sm text-ink-soft">{t('scan.reviewLead')}</p>
          {items.length === 0 && <Notice tone="warn" className="mb-4">{t('scan.noItems')}</Notice>}
          <MealEditor
            items={items}
            onItemsChange={setItems}
            meta={meta}
            onMetaChange={setMeta}
            onSave={save}
            saving={saving}
            saveLabel={t('scan.save')}
            error={saveError}
            secondaryAction={
              <>
                <Button variant="ghost" onClick={() => addFromSearch('olive oil')}>
                  <Droplet className="h-4 w-4" aria-hidden />
                  {t('scan.addOil')}
                </Button>
                <Button variant="ghost" onClick={startOver}>
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  {t('scan.startOver')}
                </Button>
              </>
            }
            extraBeforeSave={
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} className="h-4 w-4 accent-[var(--color-rose-strong)]" />
                <span>
                  {t('scan.keepPhoto')}
                  <span className="block text-xs text-ink-soft">{t('scan.keepPhotoHint')}</span>
                </span>
              </label>
            }
          />
        </div>
      </div>
    );
  }

  const analyzing = step === 'analyzing';

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card className="overflow-hidden">
        <div className="relative grid aspect-[4/3] place-items-center bg-blush-deep">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL
            <img src={image.url} alt="" className="h-full w-full object-cover" />
          ) : preparing ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-rose" aria-label={t('common.loading')} />
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-ink-soft">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-paper text-rose shadow-soft">
                <Camera className="h-7 w-7" aria-hidden />
              </span>
              <p className="max-w-xs text-sm">{t('scan.lead')}</p>
            </div>
          )}
          {analyzing && (
            <div className="absolute inset-0 grid place-items-center bg-ink/45 text-white" role="status" aria-live="polite">
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <Sparkles className="h-8 w-8 animate-pulse" aria-hidden />
                <p className="font-medium">{t('scan.analyzing')}</p>
                {slow && <p className="text-sm opacity-85">{t('scan.analyzingSlow')}</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          <Button onClick={openCamera} disabled={analyzing}>
            <Camera className="h-4 w-4" aria-hidden />
            {image ? t('scan.retake') : t('scan.takePhoto')}
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={analyzing}>
            <ImageUp className="h-4 w-4" aria-hidden />
            {image ? t('scan.replace') : t('scan.uploadPhoto')}
          </Button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          <input ref={captureInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
        {imageError && (
          <Notice tone="error" className="mx-4 mb-4">
            {imageError}
          </Notice>
        )}
      </Card>

      <div className="space-y-5">
        <ChoiceGroup<Context>
          legend={t('scan.contextLabel')}
          layout="segmented"
          value={context}
          onChange={setContext}
          options={[
            { value: 'homemade', label: t('scan.homemade') },
            { value: 'restaurant', label: t('scan.restaurant') },
            { value: 'packaged', label: t('scan.packaged') },
          ]}
        />
        <Field label={t('scan.hintLabel')} optional={t('common.optional')}>
          {({ id }) => <Input id={id} value={hint} maxLength={300} onChange={(e) => setHint(e.target.value)} placeholder={t('scan.hintPlaceholder')} />}
        </Field>

        <Notice icon={<ShieldCheck className="h-4 w-4 text-leaf-ink" />}>
          <p>{t('scan.privacyNotice')}</p>
          {!consent && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 font-medium">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-rose-strong)]" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
              {t('scan.consentCheckbox')}
            </label>
          )}
        </Notice>

        {analyzeError && (
          <Notice tone="error">
            <p>{analyzeError.message}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {analyzeError.retryable && image && (
                <button type="button" className="font-semibold underline underline-offset-2" onClick={analyze}>
                  {t('common.retry')}
                </button>
              )}
              <Link href={`/diary?date=${defaults.date}&add=1`} className="font-semibold underline underline-offset-2">
                {t('scan.addManuallyInstead')}
              </Link>
            </div>
          </Notice>
        )}

        <Button size="lg" className="w-full" onClick={analyze} disabled={!image || preparing} loading={analyzing}>
          <Sparkles className="h-5 w-5" aria-hidden />
          {analyzing ? t('scan.analyzing') : t('scan.analyze')}
        </Button>
        {analyzing && (
          <div className="space-y-2" aria-hidden>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
      </div>

      <CameraDialog
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => {
          setCameraOpen(false);
          void handleFile(file);
        }}
      />
    </div>
  );
}
