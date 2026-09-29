export type PerformancePreference = 'auto' | 'full' | 'lite';
export type PerformanceMode = 'full' | 'lite';

const STORAGE_KEY = 'rukhsa-performance-mode';
const EVENT_NAME = 'rukhsa:performance-mode';

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
};

type NavigatorWithCapabilities = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
};

export function getPerformancePreference(): PerformancePreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'full' || value === 'lite' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

export function detectPerformanceMode(): PerformanceMode {
  const preference = getPerformancePreference();
  if (preference === 'full') return 'full';
  if (preference === 'lite') return 'lite';
  if (typeof window === 'undefined') return 'full';

  const nav = navigator as NavigatorWithCapabilities;
  const connection = nav.connection;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const saveData = connection?.saveData === true;
  const effectiveType = connection?.effectiveType ?? '';
  const slowNetwork = ['slow-2g', '2g', '3g'].includes(effectiveType) ||
    (typeof connection?.downlink === 'number' && connection.downlink > 0 && connection.downlink <= 1.5);
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;

  return reducedMotion || saveData || lowMemory || (slowNetwork && lowCpu) ? 'lite' : 'full';
}

export function applyPerformancePreference(preference = getPerformancePreference()): PerformanceMode {
  const mode = preference === 'full' ? 'full' : preference === 'lite' ? 'lite' : detectPerformanceMode();
  if (typeof document !== 'undefined') document.documentElement.dataset.performance = mode;
  return mode;
}

export function setPerformancePreference(preference: PerformancePreference): PerformanceMode {
  if (typeof window !== 'undefined') {
    try {
      if (preference === 'auto') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage can be unavailable in private/restricted browsing contexts.
    }
  }
  const mode = applyPerformancePreference(preference);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mode }));
  }
  return mode;
}

export function onPerformanceModeChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onChange = () => listener();
  window.addEventListener(EVENT_NAME, onChange);
  return () => window.removeEventListener(EVENT_NAME, onChange);
}
