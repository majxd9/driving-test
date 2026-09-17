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

function playAnswerSound(ctxRef: { current: AudioContext | null }, correct: boolean) {
  const ctx = ensureAudioContext(ctxRef);
  if (!ctx) return;
  const now = ctx.currentTime;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 16;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.12;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(correct ? 0.28 : 0.20, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (correct ? 0.42 : 0.32));
  master.connect(compressor);
  compressor.connect(ctx.destination);

  if (correct) {
    [[659.25, 0, 0.66], [783.99, 0.08, 0.52], [987.77, 0.16, 0.28]].forEach(([frequency, offset, level]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(level, now + offset);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset);
      osc.stop(now + 0.42);
    });
  } else {
    [[196, 0, 0.62], [146.83, 0.09, 0.40]].forEach(([frequency, offset, level]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, now + offset);
      gain.gain.setValueAtTime(level, now + offset);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset);
      osc.stop(now + 0.33);
    });
  }
}

export default function SpiritAnswerAudio() {
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement)) return;
      // Correct/incorrect tones are training-only. The real exam must stay neutral.
      if (!target.classList.contains('study-premium-option')) return;

      const ctx = ensureAudioContext(audioRef);
      if (!ctx) return;

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
