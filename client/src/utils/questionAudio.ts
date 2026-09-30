import { resolveApiUrl } from '../api/client';

export type QuestionAudioLoadResult = {
  url: string;
  bytes: number;
  contentType: string;
};

export async function loadQuestionAudio(
  audioPath: string,
  signal?: AbortSignal,
): Promise<QuestionAudioLoadResult> {
  const response = await fetch(resolveApiUrl(audioPath), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'audio/mpeg,audio/*;q=0.9,application/octet-stream;q=0.8',
    },
    signal,
  });

  if (!response.ok) {
    let detail = '';
    const contentType = response.headers.get('content-type') ?? '';

    try {
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        detail = (await response.text()).trim();
      }
    } catch {
      // Ignore a response body that cannot be read.
    }

    throw new Error(
      detail
        ? `فشل تحميل الصوت (${response.status}): ${detail}`
        : `فشل تحميل الصوت (${response.status})`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error('وصل ملف صوت فارغ من الخادم.');
  }

  if (
    contentType &&
    !contentType.toLowerCase().startsWith('audio/') &&
    contentType.toLowerCase() !== 'application/octet-stream'
  ) {
    const body = await blob.text().catch(() => '');
    throw new Error(body ? `الخادم أعاد نوع ملف غير صوتي: ${body.slice(0, 180)}` : 'الخادم لم يُرجع ملفاً صوتياً.');
  }

  const playableBlob =
    blob.type && blob.type.toLowerCase().startsWith('audio/')
      ? blob
      : new Blob([blob], { type: 'audio/mpeg' });

  return {
    url: URL.createObjectURL(playableBlob),
    bytes: blob.size,
    contentType: contentType || playableBlob.type || 'audio/mpeg',
  };
}
