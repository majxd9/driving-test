const inFlight = new Map<string, Promise<boolean>>();

export function preloadImage(src: string, priority: 'high' | 'auto' = 'auto'): Promise<boolean> {
  if (!src || typeof window === 'undefined') return Promise.resolve(false);

  const cached = inFlight.get(src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = priority;

    const done = (ok: boolean) => {
      inFlight.set(src, Promise.resolve(ok));
      resolve(ok);
    };

    img.onload = async () => {
      try {
        await img.decode();
      } catch {
        // The image is still usable when decode() is unavailable or rejects.
      }
      done(true);
    };

    img.onerror = () => done(false);
    img.src = src;
  });

  inFlight.set(src, promise);
  return promise;
}

/** Preload a small look-ahead window without blocking the current screen. */
export function preloadImages(sources: string[], count = 3): void {
  sources.slice(0, count).forEach((src, index) => {
    void preloadImage(src, index === 0 ? 'high' : 'auto');
  });
}

/** Wait for the requested image before changing the visible question. */
export async function ensureImageReady(src: string, timeoutMs = 1200): Promise<boolean> {
  if (!src) return true;

  const preload = preloadImage(src, 'high');
  let timeoutId: number | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    return await Promise.race([preload, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}
