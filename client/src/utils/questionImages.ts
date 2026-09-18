import type { Question } from '../types';

const PRIMARY_IMAGE_BASE = '/signs';

// Current traffic-sign library. 236..245 are reviewed SVG illustrations.
function isCanonicalSignNumber(value: number): boolean {
  return (value >= 1 && value <= 131) ||
    (value >= 200 && value <= 205) ||
    (value >= 236 && value <= 245);
}

function isMechanicNumber(value: number): boolean {
  return value >= 210 && value <= 235;
}

function formatImageNumber(value: number): string {
  return value < 100 ? String(value).padStart(2, '0') : String(value);
}

/**
 * Resolve only assets that actually exist in the current repository.
 * Reviewed 236..245 signs are served as SVG so they are not discarded as
 * non-canonical images by the client-side resolver.
 */
export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(data:|blob:)/i.test(src)) return src;

  const reviewedSign = src.match(/(?:^|\/)sign_(23[6-9]|24[0-5])\.svg$/i);
  if (reviewedSign) {
    return `${PRIMARY_IMAGE_BASE}/sign_${reviewedSign[1]}.svg`;
  }

  const diagramMatch = src.match(/(?:^|\/)sign_(30[0-6])\.svg$/i);
  if (diagramMatch) {
    return `${PRIMARY_IMAGE_BASE}/sign_${diagramMatch[1]}.svg`;
  }

  const mechanicPathMatch = src.match(/(?:^|\/)mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  const signMatch = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g)$/i);

  if (mechanicPathMatch) {
    const number = Number(mechanicPathMatch[1]);
    if (!isMechanicNumber(number)) return '';
    if (number <= 214) return `${PRIMARY_IMAGE_BASE}/sign_${number}.webp`;
    return `/mechanic/mechanic_${number}.webp`;
  }

  if (!signMatch) return '';

  const number = Number(signMatch[1]);

  if (isMechanicNumber(number)) {
    if (number <= 214) return `${PRIMARY_IMAGE_BASE}/sign_${number}.webp`;
    return `/mechanic/mechanic_${number}.webp`;
  }

  if (!isCanonicalSignNumber(number)) return '';
  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}.webp`;
}



/**
 * Shows an image immediately only when the image itself is the subject of the question.
 * For ordinary questions that use a sign/diagram as a clue, the image stays hidden
 * until the student chooses an answer.
 */
export function shouldShowQuestionImageBeforeAnswer(
  question: Pick<Question, 'category' | 'text' | 'imageUrl'>,
): boolean {
  if (!question.imageUrl) return false;

  const text = question.text.replace(/[«»"“”]/g, '').trim();

  if (/ما معنى هذه الإشارة|ماذا تعني هذه الإشارة|ما معنى هذه العلامة|ماذا تعني هذه العلامة/.test(text)) {
    return true;
  }

  if (question.category === 'Mechanic' && /ما اسم هذا الجزء/.test(text)) {
    return true;
  }

  if (/ما الذي يوضحه هذا الرسم|الإشارة المرفقة|كما بالصورة/.test(text)) {
    return true;
  }

  return false;
}
