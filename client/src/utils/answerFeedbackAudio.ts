type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

function getContext() {
  const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
  if (!Ctx) return null;
  context ??= new Ctx();
  master ??= context.createGain();
  compressor ??= context.createDynamicsCompressor();
  master.connect(compressor);
  compressor.connect(context.destination);
  compressor.threshold.value = -18;
  compressor.knee.value = 10;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.10;
  master.gain.value = 1.0;
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.010);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(master!);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playAnswerFeedback(correct: boolean) {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (correct) {
    tone(ctx, 523.25, now, 0.13, 0.095, 'triangle');
    tone(ctx, 659.25, now + 0.075, 0.18, 0.11, 'triangle');
  } else {
    tone(ctx, 220, now, 0.14, 0.075, 'triangle');
    tone(ctx, 174.61, now + 0.085, 0.20, 0.070, 'triangle');
  }
}
