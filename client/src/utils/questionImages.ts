const PRIMARY_IMAGE_BASE = '/signs';

// Canonical traffic-sign library supplied with the project.
function isCanonicalSignNumber(value: number): boolean {
  return (value >= 1 && value <= 131) ||
    (value >= 200 && value <= 205);
}

// Mechanic images were accidentally removed from the latest tree. These are
// the exact bundled mechanic WebP assets from the project image library.
// Served from an immutable GitHub CDN URL until they are copied back locally.
const MECHANIC_IMAGE_BASE =
  'https://cdn.jsdelivr.net/gh/majxd9/driving-test@0191b262e264417b00ed917a370c605891dd2ee0/client/public/mechanic';

function isMechanicNumber(value: number): boolean {
  return value >= 215 && value <= 235;
}

function formatImageNumber(value: number): string {
  return value < 100 ? String(value).padStart(2, '0') : String(value);
}

/**
 * Resolves question images without ever falling back to unrelated/legacy
 * traffic-sign artwork. Mechanic images and AI explanatory diagrams are
 * handled as separate, explicit asset types.
 */
export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';

  if (/^(data:|blob:)/i.test(src)) return src;

  const diagramMatch = src.match(/(?:^|\/)sign_(30[0-6])\.svg$/i);
  if (diagramMatch) {
    return `${PRIMARY_IMAGE_BASE}/sign_${diagramMatch[1]}.svg`;
  }

  const mechanicMatch = src.match(/(?:^|\/)mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  const signMatch = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g)$/i);

  if (mechanicMatch) {
    const number = Number(mechanicMatch[1]);
    if (!isMechanicNumber(number)) return '';
    return `${MECHANIC_IMAGE_BASE}/mechanic_${number}.webp`;
  }

  if (!signMatch) return '';

  const number = Number(signMatch[1]);

  // The question bank historically used sign_215..235 for mechanic questions.
  // Resolve those legacy references only to the exact mechanic asset, never
  // to a traffic-sign image.
  if (isMechanicNumber(number)) {
    return `${MECHANIC_IMAGE_BASE}/mechanic_${number}.webp`;
  }

  if (!isCanonicalSignNumber(number)) return '';

  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}.webp`;
}
