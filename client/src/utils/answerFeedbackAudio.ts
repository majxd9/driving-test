import { getSpiritVolume } from './spiritVolume';

type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

let context: AudioContext | null = null;

async function getContext() {
  const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
  if (!Ctx) return null;
  context ??= new Ctx();
  if (context.state === 'suspended') await context.resume();
  return context;
}

function ping(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.025);
}

function softNoise(ctx: AudioContext, start: number, duration: number, volume: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration);
}

export async function playAnswerFeedback(correct: boolean) {
  const ctx = await getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const savedVolume = getSpiritVolume();
  // Answer feedback remains audible even when an old saved header-mute setting is 0.
  const level = savedVolume === 0 ? 0.28 : Math.min(0.34, 0.28 * savedVolume + 0.06);

  if (correct) {
    ping(ctx, 587.33, now, 0.12, level * 0.62, 'sine');
    ping(ctx, 783.99, now + 0.065, 0.18, level * 0.72, 'sine');
  } else {
    ping(ctx, 293.66, now, 0.13, level * 0.58, 'triangle');
    ping(ctx, 233.08, now + 0.07, 0.19, level * 0.62, 'triangle');
    softNoise(ctx, now, 0.12, level * 0.10);
  }
}
