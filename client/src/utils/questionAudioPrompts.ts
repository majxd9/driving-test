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

let promptPlaybackEndedListener: (() => void) | null = null;
let promptPlaybackGeneration = 0;

function clearPromptPlaybackEndedListener() {
  if (promptPlaybackAudio && promptPlaybackEndedListener) {
    promptPlaybackAudio.removeEventListener('ended', promptPlaybackEndedListener);
  }
  promptPlaybackEndedListener = null;
}

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

export function getCachedQuestionAudioPromptSource(
  key: QuestionAudioPromptKey
): string | null {
  return promptSourceCache.get(key) ?? null;
}

export function stopQuestionAudioPrompt() {
  promptPlaybackGeneration += 1;
  clearPromptPlaybackEndedListener();
  const audio = promptPlaybackAudio;
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
}

export function unlockQuestionAudioPrompt(key: QuestionAudioPromptKey = 'question-audio-first-entry') {
  const audio = promptPlaybackAudio;
  if (!audio) return;

  // The training button is a real user gesture. Briefly starting the same
  // audio element muted unlocks playback for the post-navigation prompt.
  // A generation guard prevents this unlock promise from pausing a real prompt
  // that started immediately after navigation.
  const generation = promptPlaybackGeneration;
  try {
    audio.pause();
    audio.muted = true;
    const unlockSource = promptSourceCache.get(key) ?? resolveApiUrl(
      `/api/questions/audio-prompt/${key}`
    );
    audio.src = new URL(unlockSource, window.location.href).href;
    audio.preload = 'auto';
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise) {
      void promise.then(() => {
        if (generation !== promptPlaybackGeneration) return;
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {
        if (generation === promptPlaybackGeneration) audio.muted = false;
      });
    }
  } catch {
    audio.muted = false;
  }
}

export function playQuestionAudioPrompt(
  key: QuestionAudioPromptKey,
  onEnded?: () => void
): Promise<boolean> {
  const audio = promptPlaybackAudio;
  if (!audio) return Promise.resolve(false);

  const cachedSource = promptSourceCache.get(key);
  const directSource = resolveApiUrl(
    `/api/questions/audio-prompt/${key}`
  );

  try {
    promptPlaybackGeneration += 1;
    clearPromptPlaybackEndedListener();
    audio.pause();
    audio.muted = false;
    audio.src = cachedSource || directSource;
    audio.preload = 'auto';
    audio.currentTime = 0;

    if (onEnded) {
      const endedListener = () => {
        if (promptPlaybackEndedListener === endedListener) {
          promptPlaybackEndedListener = null;
        }
        onEnded();
      };
      promptPlaybackEndedListener = endedListener;
      audio.addEventListener('ended', endedListener, { once: true });
    }

    // Keep play() synchronous within the user gesture for mobile/WebView.
    const playPromise = audio.play();
    if (!playPromise) return Promise.resolve(true);

    return playPromise.then(
      () => true,
      () => {
        clearPromptPlaybackEndedListener();
        return false;
      }
    );
  } catch {
    clearPromptPlaybackEndedListener();
    audio.pause();
    return Promise.resolve(false);
  }
}
