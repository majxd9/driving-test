import { resolveApiUrl } from '../api/client';

export type QuestionAudioPromptKey =
  | 'question-audio-first-entry'
  | 'question-audio-enabled'
  | 'question-audio-disabled';

const promptTexts: Record<QuestionAudioPromptKey, string> = {
  'question-audio-first-entry': 'إذا بدك تشغيل الصوت، اضغط زر التشغيل.',
  'question-audio-enabled': 'الصوت سيبقى شغال حتى تضغط إيقاف.',
  'question-audio-disabled': 'الصوت متوقف.',
};

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

function speakPromptFallback(key: QuestionAudioPromptKey): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(promptTexts[key]);
    utterance.lang = 'ar-SY';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Keep the UI functional when browser speech synthesis is unavailable.
  }
}

export async function playQuestionAudioPrompt(
  key: QuestionAudioPromptKey
): Promise<void> {
  const audio = createQuestionAudioPrompt(key);
  if (!audio) {
    speakPromptFallback(key);
    return;
  }

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
  if (retryAudio) {
    retryAudio.currentTime = 0;
    try {
      await retryAudio.play();
      return;
    } catch {
      // Fall through to the browser speech fallback.
    }
  }

  speakPromptFallback(key);
}
