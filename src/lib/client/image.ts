'use client';

export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 1600;
const TARGET_BYTES = 1.5 * 1024 * 1024;

export type PreparedImage = { blob: Blob; url: string; width: number; height: number };

export class ImageError extends Error {
  constructor(public code: 'too_large' | 'type' | 'decode') {
    super(code);
  }
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Validates and downsizes a photo in the browser: longest edge ≤ 1600 px, JPEG,
 * stepping quality down until it is under ~1.5 MB. EXIF orientation is applied by
 * createImageBitmap, and re-encoding drops EXIF metadata such as GPS location.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('too_large');
  if (file.type && !ACCEPTED.includes(file.type.toLowerCase())) throw new ImageError('type');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageError('decode');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('decode');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.86;
  let blob: Blob | null = null;
  for (let i = 0; i < 4; i++) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size <= TARGET_BYTES) break;
    quality -= 0.12;
  }
  if (!blob) throw new ImageError('decode');
  return { blob, url: URL.createObjectURL(blob), width, height };
}
