export function speakArabicFallback(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    const synthesis = window.speechSynthesis;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = synthesis.getVoices();
    const arabicVoice = voices.find(voice =>
      voice.lang.toLowerCase().startsWith('ar')
    );

    if (arabicVoice) utterance.voice = arabicVoice;
    synthesis.speak(utterance);
  } catch {
    // Fallback voice must never interrupt the question audio flow.
  }
}

export function stopArabicFallback(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore speech API failures.
  }
}
