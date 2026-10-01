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
  audio.load();
  promptCache.set(key, audio);
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
  } catch {
    audio.load();
    audio.currentTime = 0;
    await audio.play();
  }
}
