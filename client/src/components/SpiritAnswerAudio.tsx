import { useEffect, useRef } from 'react';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

function getAudioContext() {
  const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
  if (!Ctx) return null;
  return Ctx;
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

function playAnswerSound(ctxRef: { current: AudioContext | null }, correct: boolean) {
  const Ctx = getAudioContext();
  if (!Ctx) return;
  const ctx = ctxRef.current ?? new Ctx();
  ctxRef.current = ctx;
  if (ctx.state === 'suspended') void ctx.resume();
  const now = ctx.currentTime;

  if (correct) {
    playTone(ctx, 523.25, 0.18, now, 0.105);
    playTone(ctx, 659.25, 0.22, now + 0.09, 0.085);
  } else {
    playTone(ctx, 220, 0.20, now, 0.075);
    playTone(ctx, 174.61, 0.24, now + 0.10, 0.055);
  }
}

export default function SpiritAnswerAudio() {
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement)) return;
      if (!target.classList.contains('study-premium-option') && !target.classList.contains('exam-option-v2')) return;
      window.requestAnimationFrame(() => {
        const correct = target.classList.contains('is-correct') && !target.classList.contains('is-wrong');
        playAnswerSound(audioRef, correct);
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
