import { resolveApiUrl } from '../api/client';

export type QuestionAudioPromptKey =
  | 'question-audio-first-entry'
  | 'question-audio-enabled'
  | 'question-audio-disabled';

const promptCache = new Map<QuestionAudioPromptKey, HTMLAudioElement>();
const promptSourceCache = new Map<QuestionAudioPromptKey, string>();
const promptInflight = new Map<QuestionAudioPromptKey, Promise<string>>();
const promptPlaybackAudio =
  typeof window === 'undefined' ? null : new Audio();

function looksLikeMp3(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  );
}

export async function getQuestionAudioPromptSource(
  key: QuestionAudioPromptKey
): Promise<string> {
  const cached = promptSourceCache.get(key);
  if (cached) return cached;

  const existing = promptInflight.get(key);
  if (existing) return existing;

  const promise = fetch(
    resolveApiUrl(`/api/questions/audio-prompt/${key}`),
    { credentials: 'omit', cache: 'force-cache' }
  )
    .then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (!looksLikeMp3(bytes))
        throw new Error('ملف رسالة الصوت المخزّن ليس MP3 صالحاً.');

      const objectUrl = URL.createObjectURL(
        new Blob([buffer], { type: 'audio/mpeg' })
      );
      promptSourceCache.set(key, objectUrl);
      return objectUrl;
    })
    .finally(() => {
      promptInflight.delete(key);
    });

  promptInflight.set(key, promise);
  return promise;
}

export function createQuestionAudioPrompt(
  key: QuestionAudioPromptKey
): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  const cached = promptCache.get(key);
  if (cached) return cached;

  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = resolveApiUrl(`/api/questions/audio-prompt/${key}`);
  audio.addEventListener('error', () => {
    if (promptCache.get(key) === audio) {
      promptCache.delete(key);
    }
  });
  promptCache.set(key, audio);
  audio.load();
  return audio;
}

export function preloadQuestionAudioPrompt(key: QuestionAudioPromptKey) {
  void getQuestionAudioPromptSource(key).catch(() => undefined);
}

export async function playQuestionAudioPrompt(
  key: QuestionAudioPromptKey
): Promise<boolean> {
  const audio = promptPlaybackAudio;
  if (!audio) return false;

  const directSource = resolveApiUrl(
    `/api/questions/audio-prompt/${key}`
  );

  try {
    audio.pause();
    audio.src = directSource;
    audio.preload = 'auto';
    audio.currentTime = 0;

    // Important: call play() before awaiting any network work so a mobile
    // browser/WebView still sees the original user gesture.
    await audio.play();
    return true;
  } catch {
    try {
      const cachedSource = await getQuestionAudioPromptSource(key);
      audio.pause();
      audio.src = cachedSource;
      audio.preload = 'auto';
      audio.currentTime = 0;
      await audio.play();
      return true;
    } catch {
      audio.pause();
      return false;
    }
  }
}
