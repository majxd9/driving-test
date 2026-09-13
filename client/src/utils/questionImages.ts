const PRIMARY_IMAGE_BASE = '/signs';

// Current uploaded traffic-sign library: sign_01..131 and sign_200..205.
function isCanonicalSignNumber(value: number): boolean {
  return (value >= 1 && value <= 131) ||
    (value >= 200 && value <= 205);
}

// Current uploaded mechanic library: 210..235. In the repository,
// 210..214 live under /signs while 215..235 live under /mechanic.
function isMechanicNumber(value: number): boolean {
  return value >= 210 && value <= 235;
}

function formatImageNumber(value: number): string {
  return value < 100 ? String(value).padStart(2, '0') : String(value);
}

/**
 * Resolves only assets from the current uploaded image pack.
 * Legacy/V1 images are never used as a fallback.
 * AI explanatory diagrams 300..306 remain a separate, explicit exception.
 */
export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(data:|blob:)/i.test(src)) return src;

  const diagramMatch = src.match(/(?:^|\/)sign_(30[0-6])\.svg$/i);
  if (diagramMatch) {
    return `${PRIMARY_IMAGE_BASE}/sign_${diagramMatch[1]}.svg`;
  }

  const mechanicPathMatch = src.match(/(?:^|\/)mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  const signMatch = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g)$/i);

  if (mechanicPathMatch) {
    const number = Number(mechanicPathMatch[1]);
    if (!isMechanicNumber(number)) return '';
    // The uploaded pack stores 210..214 in the signs directory.
    if (number <= 214) return `${PRIMARY_IMAGE_BASE}/sign_${number}.webp`;
    return `/mechanic/mechanic_${number}.webp`;
  }

  if (!signMatch) return '';

  const number = Number(signMatch[1]);

  // 210..235 are mechanic visuals from the uploaded pack, not traffic signs.
  if (isMechanicNumber(number)) {
    if (number <= 214) return `${PRIMARY_IMAGE_BASE}/sign_${number}.webp`;
    return `/mechanic/mechanic_${number}.webp`;
  }

  if (!isCanonicalSignNumber(number)) return '';
  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}.webp`;
}
