import type { Question } from '../types';

const PRIMARY_IMAGE_BASE = '/signs';

function normalizeQuestionText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[ـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

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

export function resolveQuestionImageUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(data:|blob:)/i.test(src)) return src;

  const reviewedSign = src.match(/(?:^|\/)sign_(23[6-9]|24[0-5])\.(?:svg|webp)$/i);
  if (reviewedSign) {
    const ext = reviewedSign[0].toLowerCase().endsWith('.svg') ? 'svg' : 'webp';
    return `${PRIMARY_IMAGE_BASE}/sign_${reviewedSign[1]}.${ext}`;
  }

  const diagramMatch = src.match(/(?:^|\/)sign_(30[0-6])\.svg$/i);
  if (diagramMatch) return `${PRIMARY_IMAGE_BASE}/sign_${diagramMatch[1]}.svg`;

  const mechanicPathMatch = src.match(/(?:^|\/)mechanic\/mechanic_(\d+)\.(?:webp|png|jpe?g)$/i);
  const signMatch = src.match(/(?:^|\/)sign_(\d+)\.(?:webp|png|jpe?g|svg)$/i);

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

  if (!isCanonicalSignNumber(number)) return src;
  return `${PRIMARY_IMAGE_BASE}/sign_${formatImageNumber(number)}${/\.svg$/i.test(signMatch[0]) ? '.svg' : '.webp'}`;
}

/**
 * Images that are required to understand the question are shown immediately.
 * In particular, a traffic-sign question is incomplete without its sign image.
 */
export function shouldShowQuestionImageBeforeAnswer(
  question: Pick<Question, 'text' | 'imageUrl'> & { category?: Question['category'] },
): boolean {
  if (!question.imageUrl) return false;

  const text = normalizeQuestionText(question.text);

  if (question.category === 'Ishara') return true;

  if (
    question.category === 'Mechanic' &&
    /(ما معنى هذه الاشارة|ماذا تعني هذه الاشارة|ما معنى هذه العلامة|ماذا تعني هذه العلامة|ما اسم هذا الجزء|ما اسم هذه القطعة|ما اسم هذا المكون|اين يوجد هذا الجزء)/.test(text)
  ) return true;

  return /(ما معنى هذه الاشارة|ماذا تعني هذه الاشارة|ما معنى هذه العلامة|ماذا تعني هذه العلامة|ما الذي يوضحه هذا الرسم|الاشارة المرفقة|كما بالصورة|كما في الصورة|حسب الصورة|بالصورة المرفقة)/.test(text);
}
