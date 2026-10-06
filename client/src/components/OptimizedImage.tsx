import { useEffect, useMemo, useState } from 'react';
import { resolveQuestionImageUrl } from '../utils/questionImages';

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover';
  onError?: () => void;
  showError?: boolean;
  authenticatedMedia?: boolean;
};

export { resolveQuestionImageUrl } from '../utils/questionImages';

function withVersion(url: string) {
  if (!url || /^(data:|blob:)/i.test(url)) return url;
  // Bump the public-image cache key when the canonical image pack changes.
  return `${url}${url.includes('?') ? '&' : '?'}v=20261005`;
}

function imageCandidates(src: string, canonicalSrc: string) {
  // Try the cache-busted asset first, then the raw public URL. This keeps
  // original images visible even when a CDN has a stale cached response.
  const candidates = [withVersion(canonicalSrc), canonicalSrc];
  if (src && src !== canonicalSrc) {
    candidates.push(withVersion(src), src);
  }
  return [...new Set(candidates.filter(Boolean))];
}

export default function OptimizedImage({
  src,
  alt,
  className = '',
  priority = false,
  sizes,
  objectFit = 'contain',
  onError,
  showError = true,
  authenticatedMedia = false,
}: Props) {
  // AI images and other API media URLs are already resolved URLs; only local question assets need the sign/mechanic resolver.
  const canonicalSrc = useMemo(() => {
    if (/^(https?:|data:|blob:)/i.test(src) || /^\/api\//i.test(src)) return src;
    return resolveQuestionImageUrl(src);
  }, [src]);
  const candidates = useMemo(() => imageCandidates(src, canonicalSrc), [src, canonicalSrc]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
    setFailed(false);
    setMediaSrc(null);
    setRetryAttempt(0);
  }, [canonicalSrc, src, authenticatedMedia]);

  const activeSrc = candidates[candidateIndex] ?? candidates[0];

  useEffect(() => {
    if (!authenticatedMedia || !activeSrc) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;

    void fetch(activeSrc, {
      credentials: 'include',
      cache: 'force-cache',
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setMediaSrc(objectUrl);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFailed(true);
        setLoaded(true);
        onError?.();
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [authenticatedMedia, activeSrc]);

  if (!canonicalSrc || !candidates.length) return null;

  const addRetryToken = (url: string | null) => {
    if (!url || retryAttempt <= 0 || /^(data:|blob:)/i.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}img-retry=${retryAttempt}`;
  };

  const renderedSrc = authenticatedMedia ? mediaSrc : addRetryToken(activeSrc);

  return (
    <div className={`relative ${className}`}>
      {!loaded && !failed && <div className="absolute inset-0 skeleton" aria-hidden="true" />}
      <img
        src={renderedSrc || undefined}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (candidateIndex + 1 < candidates.length) {
            setCandidateIndex(index => index + 1);
            setLoaded(false);
            setFailed(false);
            return;
          }

          if (retryAttempt < 2) {
            const nextAttempt = retryAttempt + 1;
            window.setTimeout(() => {
              setRetryAttempt(nextAttempt);
              setLoaded(false);
              setFailed(false);
            }, 500 * nextAttempt);
            return;
          }

          setFailed(true);
          setLoaded(true);
          onError?.();
        }}
        className={`block w-full h-full object-${objectFit} ${loaded ? '' : 'opacity-0'}`}
      />
      {failed && showError && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted bg-paper p-3 text-center">
          تعذر تحميل الصورة
        </div>
      )}
    </div>
  );
}
