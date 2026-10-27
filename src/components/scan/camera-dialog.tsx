'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useT } from '@/i18n/client';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Notice } from '../ui/surface';

/** Live camera preview using getUserMedia; returns a captured frame as a File. */
export function CameraDialog({ open, onClose, onCapture }: { open: boolean; onClose: () => void; onCapture: (file: File) => void }) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setReady(false);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setReady(true);
        }
      } catch (err) {
        const name = (err as DOMException)?.name;
        setError(name === 'NotAllowedError' || name === 'SecurityError' ? t('scan.cameraDenied') : t('scan.cameraUnavailable'));
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [open, t]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `meal-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('scan.cameraTitle')}
      closeLabel={t('common.close')}
      size="lg"
      footer={
        !error && (
          <Button onClick={capture} disabled={!ready} size="lg">
            <Camera className="h-5 w-5" aria-hidden />
            {t('scan.capture')}
          </Button>
        )
      }
    >
      {error ? (
        <Notice tone="warn">{error}</Notice>
      ) : (
        <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-2xl bg-ink object-cover" aria-label={t('scan.cameraTitle')} />
      )}
    </Dialog>
  );
}
