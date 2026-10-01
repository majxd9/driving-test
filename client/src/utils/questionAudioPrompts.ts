import { resolveApiUrl } from '../api/client';

export type QuestionAudioPromptKey =
  | 'question-audio-first-entry'
  | 'question-audio-enabled'
  | 'question-audio-disabled';

export function createQuestionAudioPrompt(
  key: QuestionAudioPromptKey
): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  const audio = new Audio(
    resolveApiUrl(`/api/questions/audio-prompt/${key}`)
  );
  audio.preload = 'auto';
  return audio;
}
