type AudioContextConstructor = typeof AudioContext;
type ExtendedWindow = Window & typeof globalThis & { webkitAudioContext?: AudioContextConstructor };

let context: AudioContext | null = null;

function getContext() {
  const Ctx = ((window as ExtendedWindow).AudioContext || (window as ExtendedWindow).webkitAudioContext);
  if (!Ctx) return null;
  context ??= new Ctx();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playAnswerFeedback(correct: boolean) {
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (correct) {
    tone(ctx, 392, now, 0.10, 0.035);
    tone(ctx, 523.25, now + 0.08, 0.14, 0.040);
  } else {
    tone(ctx, 220, now, 0.11, 0.030);
    tone(ctx, 174.61, now + 0.08, 0.16, 0.028);
  }
}
