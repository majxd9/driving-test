export const SPIRIT_VOLUME_KEY = 'driving-spirit-volume';
export const SPIRIT_VOLUME_EVENT = 'driving-spirit-volume-change';

const LEVELS = [1, 0.6, 0] as const;

export function getSpiritVolume(): number {
  try {
    const value = Number(localStorage.getItem(SPIRIT_VOLUME_KEY));
    return LEVELS.includes(value as (typeof LEVELS)[number]) ? value : 1;
  } catch {
    return 1;
  }
}

export function cycleSpiritVolume(current: number): number {
  const index = LEVELS.indexOf(current as (typeof LEVELS)[number]);
  return LEVELS[(index + 1) % LEVELS.length];
}

export function setSpiritVolume(volume: number): void {
  const safe = LEVELS.includes(volume as (typeof LEVELS)[number]) ? volume : 1;
  try {
    localStorage.setItem(SPIRIT_VOLUME_KEY, String(safe));
  } catch {
    // Audio preference is best-effort only.
  }
  window.dispatchEvent(new Event(SPIRIT_VOLUME_EVENT));
}
