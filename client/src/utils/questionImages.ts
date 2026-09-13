const PRIMARY_IMAGE_BASE = '/signs';

// Canonical traffic-sign library supplied with the project.
function isCanonicalSignNumber(value: number): boolean {
  return (value >= 1 && value <= 131) ||
    (value >= 200 && value <= 205);
}

// The canonical mechanic set contains 210-235. The first five were originally
// stored as sign_210..214; the remaining set uses mechanic_215..235.
// These immutable CDN URLs point to the exact project assets, not V1 fallbacks.
const LIBRARY_CDN_BASE =
  'https://cdn.jsdelivr.net/gh/majxd9/driving-test@0191b262e264417b00ed917a370c605891dd2ee0/client/public';

function isMechanicNumber(value: number): boolean {
  return value >= 210 && value <= 235;
}

function formatImageNumber(value: number): string {
  return value < 100 ? String(value).padStart(2, '0') : String(value);
}

/**
 * Resolves question images without using unrelated or legacy traffic-sign
 * artwork. Mechanic assets and AI explanatory diagrams are explicit types.
 */
export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';

  if (/^(data:|blob:)/i.test(src)) return src;

  // AI-created explanatory visuals only.
  const diagramMatch = src.match(/(?:^|\/)sign_(30[0-6])\.svg$/i);
  if (diagramMatch) {
    return `${PRIMARY_IMAGE_BASE}/sign_${diagramMatch[1]}.svg`;
  }

  const mechanicPathMatch = src.match(/(?:^|\/)mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  const signMatch = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g)$/i);

  if (mechanicPathMatch) {
    const number = Number(mechanicPathMatch[1]);
    if (!isMechanicNumber(number)) return '';
    if (number <= 214) {
      return `${LIBRARY_CDN_BASE}/signs/sign_${number}.webp`;
    }
    return `${LIBRARY_CDN_BASE}/mechanic/mechanic_${number}.webp`;
  }

  if (!signMatch) return '';

  const number = Number(signMatch[1]);

  // The question bank historically uses sign_210..235 for the canonical
  // mechanic set. Never substitute a traffic-sign image for these questions.
  if (isMechanicNumber(number)) {
    if (number <= 214) {
      return `${LIBRARY_CDN_BASE}/signs/sign_${number}.webp`;
    }
    return `${LIBRARY_CDN_BASE}/mechanic/mechanic_${number}.webp`;
  }

  if (!isCanonicalSignNumber(number)) return '';

  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}.webp`;
}
