let modulePromise: Promise<any> | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

const VOICE_ID = 'ar_JO-kareem-medium';
const CDN_MODULE = 'https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/+esm';

async function getTtsModule() {
  if (!modulePromise) {
    modulePromise = import(/* @vite-ignore */ CDN_MODULE);
  }
  return modulePromise;
}

export function stopArabicSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

export async function speakArabic(text: string): Promise<void> {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return;

  stopArabicSpeech();

  const tts = await getTtsModule();
  const wav = await tts.predict({ text: cleanText, voiceId: VOICE_ID });
  const url = URL.createObjectURL(wav);
  currentUrl = url;

  const audio = new Audio(url);
  currentAudio = audio;

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      if (currentUrl === url) {
        URL.revokeObjectURL(url);
        currentUrl = null;
      }
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      if (currentUrl === url) {
        URL.revokeObjectURL(url);
        currentUrl = null;
      }
      reject(new Error('تعذر تشغيل الصوت.'));
    };
    void audio.play().catch(reject);
  });
}
