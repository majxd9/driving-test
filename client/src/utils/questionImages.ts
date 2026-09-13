const PRIMARY_IMAGE_BASE = 'https://darling-paprenjak-d027ae.netlify.app/signs';

function isPrimaryImageNumber(value: number): boolean {
  return (value >= 1 && value <= 131) ||
    (value >= 200 && value <= 205) ||
    (value >= 210 && value <= 235);
}

function formatImageNumber(value: number): string {
  return value < 100 ? String(value).padStart(2, '0') : String(value);
}

/**
 * Resolves legacy question image paths to the single canonical image library.
 * Unsupported legacy assets intentionally return an empty string so an old
 * repository image can never silently reappear after the cleanup.
 */
export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';

  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  const signMatch = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g)$/i);
  const mechanicMatch = src.match(/\/mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  const numberMatch = signMatch ?? mechanicMatch;

  if (!numberMatch) return '';

  const number = Number(numberMatch[1]);
  if (!isPrimaryImageNumber(number)) return '';

  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}.png`;
}
