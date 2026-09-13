const PRIMARY_IMAGE_BASE = '/signs';

// Only the supplied/current image library is allowed for question images.
// V1/legacy images and old mechanic images are intentionally rejected.
function isCanonicalImageNumber(value: number): boolean {
  return (value >= 1 && value <= 99) ||
    (value >= 200 && value <= 214);
}

function formatImageNumber(value: number): string {
  return value < 100 ? String(value).padStart(2, '0') : String(value);
}

/**
 * Resolves question image references to the bundled canonical WebP library.
 * Legacy mechanic paths and unsupported/old image numbers return empty so the
 * app never silently falls back to an old visual.
 */
export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';

  if (/^(data:|blob:)/i.test(src)) return src;

  const match = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g)$/i);
  if (!match) return '';

  const number = Number(match[1]);
  if (!isCanonicalImageNumber(number)) return '';

  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}.webp`;
}
