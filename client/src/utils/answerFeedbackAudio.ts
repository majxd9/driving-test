import { getSpiritVolume } from './spiritVolume';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let connected = false;

function getContext() {
  const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
  if (!Ctx) return null;
  context ??= new Ctx();
  master ??= context.createGain();
  compressor ??= context.createDynamicsCompressor();

  if (!connected) {
    master.connect(compressor);
    compressor.connect(context.destination);
    connected = true;
  }

  compressor.threshold.value = -24;
  compressor.knee.value = 14;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.18;
  master.gain.value = 0.72;

  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume * getSpiritVolume() * 0.62, 0.0001), start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(master!);
  osc.start(start);
  osc.stop(start + duration + 0.025);
}

export function playAnswerFeedback(correct: boolean) {
  const ctx = getContext();
  if (!ctx || getSpiritVolume() === 0) return;
  const now = ctx.currentTime;
  if (correct) {
    // Gentle, rounded two-note confirmation.
    tone(ctx, 587.33, now, 0.19, 0.12, 'sine');
    tone(ctx, 739.99, now + 0.09, 0.24, 0.13, 'sine');
  } else {
    // Soft descending pair: noticeable but not harsh or alarm-like.
    tone(ctx, 293.66, now, 0.18, 0.075, 'sine');
    tone(ctx, 246.94, now + 0.09, 0.23, 0.07, 'sine');
  }
}
