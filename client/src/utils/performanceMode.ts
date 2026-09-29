const STORAGE_KEY = 'rukhseti-performance-mode';
export type PerformanceMode = 'auto' | 'full' | 'save';

function isLowEnd(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string; downlink?: number; rtt?: number };
  };
  const connection = nav.connection;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    Boolean(connection?.saveData) ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g' ||
    (typeof connection?.downlink === 'number' && connection.downlink <= 1.5) ||
    (typeof connection?.rtt === 'number' && connection.rtt >= 500) ||
    (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) ||
    (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4)
  );
}

export function getPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'auto';
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'full' || value === 'save' ? value : 'auto';
}

export function applyPerformanceMode(mode: PerformanceMode = getPerformanceMode()): boolean {
  if (typeof document === 'undefined') return false;
  const save = mode === 'save' || (mode === 'auto' && isLowEnd());
  document.documentElement.dataset.performance = save ? 'save' : 'full';
  document.documentElement.dataset.performanceMode = mode;
  return save;
}

export function setPerformanceMode(mode: PerformanceMode): boolean {
  if (typeof window !== 'undefined') {
    if (mode === 'auto') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, mode);
  }
  return applyPerformanceMode(mode);
}
