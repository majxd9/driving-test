export const QUESTION_AUDIO_PROMPTS = {
  // Generate this file with the same Arabic AI voice used for the question audio.
  enabled: '/audio/prompts/question-audio-enabled.mp3',
} as const;

export function createQuestionAudioPrompt(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  const audio = new Audio(QUESTION_AUDIO_PROMPTS.enabled);
  audio.preload = 'auto';
  return audio;
}
