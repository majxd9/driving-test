import { useEffect, useRef } from 'react';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

function getAudioContext() {
  const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
  if (!Ctx) return null;
  return Ctx;
}

function ensureAudioContext(ref: { current: AudioContext | null }) {
  const Ctx = getAudioContext();
  if (!Ctx) return null;
  const ctx = ref.current ?? new Ctx();
  ref.current = ctx;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function playTone(ctx: AudioContext, frequency: number, duration: number, start: number, gainValue: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playAnswerSound(ctx: AudioContext, correct: boolean) {
  const now = ctx.currentTime;
  if (correct) {
    playTone(ctx, 523.25, 0.18, now, 0.15);
    playTone(ctx, 659.25, 0.22, now + 0.09, 0.12);
  } else {
    playTone(ctx, 220, 0.20, now, 0.10);
    playTone(ctx, 174.61, 0.24, now + 0.10, 0.075);
  }
}

export default function SpiritAnswerAudio() {
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement)) return;
      if (!target.classList.contains('study-premium-option') && !target.classList.contains('exam-option-v2')) return;

      // Create/resume audio during the real user gesture; inspect the answer state just after React updates it.
      const ctx = ensureAudioContext(audioRef);
      if (!ctx) return;
      window.requestAnimationFrame(() => {
        const correct = target.classList.contains('is-correct') && !target.classList.contains('is-wrong');
        playAnswerSound(ctx, correct);
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
