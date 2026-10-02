import { resolveApiUrl } from '../api/client';

export type QuestionAudioPromptKey =
  | 'question-audio-first-entry'
  | 'question-audio-enabled'
  | 'question-audio-disabled';

const promptCache = new Map<QuestionAudioPromptKey, HTMLAudioElement>();

export function createQuestionAudioPrompt(
  key: QuestionAudioPromptKey
): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  const cached = promptCache.get(key);
  if (cached) return cached;

  const audio = new Audio(
    resolveApiUrl(`/api/questions/audio-prompt/${key}`)
  );
  audio.preload = 'auto';

  audio.addEventListener('error', () => {
    if (promptCache.get(key) === audio) {
      promptCache.delete(key);
    }
  });

  promptCache.set(key, audio);
  audio.load();
  return audio;
}

export async function playQuestionAudioPrompt(
  key: QuestionAudioPromptKey
): Promise<void> {
  const audio = createQuestionAudioPrompt(key);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;

  try {
    await audio.play();
    return;
  } catch {
    if (promptCache.get(key) === audio) {
      promptCache.delete(key);
    }
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  const retryAudio = createQuestionAudioPrompt(key);
  if (!retryAudio) return;

  retryAudio.currentTime = 0;
  try {
    await retryAudio.play();
  } catch {
    // Ignore playback failures; keep the question audio controls usable.
  }
}
