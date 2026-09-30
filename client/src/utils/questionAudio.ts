const MAX_CACHED_AUDIO = 24;

type CachedAudio = { objectUrl: string };

const audioCache = new Map<string, CachedAudio>();
const audioInflight = new Map<string, Promise<string>>();

function looksLikeMp3(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && (
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  );
}

function trimAudioCache() {
  while (audioCache.size > MAX_CACHED_AUDIO) {
    const oldest = audioCache.entries().next().value as [string, CachedAudio] | undefined;
    if (!oldest) return;
    const [url, entry] = oldest;
    audioCache.delete(url);
    URL.revokeObjectURL(entry.objectUrl);
  }
}

export async function getQuestionAudioSource(url: string): Promise<string> {
  const cached = audioCache.get(url);
  if (cached) {
    audioCache.delete(url);
    audioCache.set(url, cached);
    return cached.objectUrl;
  }

  const existing = audioInflight.get(url);
  if (existing) return existing;

  const promise = fetch(url, {
    credentials: 'omit',
    // The URL contains the audio content hash, so browser caching is safe.
    cache: 'force-cache',
  })
    .then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (!bytes.length) throw new Error('ملف الصوت فارغ');
      if (!looksLikeMp3(bytes)) throw new Error('ملف الصوت المخزّن ليس MP3 صالحاً');

      const objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
      audioCache.set(url, { objectUrl });
      trimAudioCache();
      return objectUrl;
    })
    .finally(() => {
      audioInflight.delete(url);
    });

  audioInflight.set(url, promise);
  return promise;
}

export function preloadQuestionAudio(url?: string | null) {
  if (!url) return;
  void getQuestionAudioSource(url).catch(() => undefined);
}
