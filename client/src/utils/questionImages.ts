const PRIMARY_IMAGE_BASE = '/signs';

function isPrimaryImageNumber(value: number): boolean {
  return (value >= 1 && value <= 131) ||
    (value >= 200 && value <= 205) ||
    (value >= 210 && value <= 235);
}

function formatImageNumber(value: number): string {
  return value < 100 ? String(value).padStart(2, '0') : String(value);
}

/**
 * Resolves all legacy question image references to the local, compressed WebP
 * library shipped with the app. Keeping this local avoids slow external image
 * fetches and prevents stale/old assets from silently returning.
 */
export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';

  if (/^(data:|blob:)/i.test(src)) return src;

  const signMatch = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g|svg)$/i);
  const mechanicMatch = src.match(/\/mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g|svg)$/i);
  const numberMatch = signMatch ?? mechanicMatch;

  if (!numberMatch) return '';

  const number = Number(numberMatch[1]);
  if (!isPrimaryImageNumber(number)) return '';

  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}.webp`;
}
