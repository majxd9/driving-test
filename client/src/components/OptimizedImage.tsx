import { useEffect, useMemo, useState } from 'react';
import { resolveQuestionImageUrl } from '../utils/questionImages';

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover';
};

export { resolveQuestionImageUrl } from '../utils/questionImages';

function withVersion(url: string) {
  if (!url || /^(data:|blob:)/i.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=20260914`;
}

function imageCandidates(src: string, canonicalSrc: string) {
  const candidates = [withVersion(canonicalSrc)];
  if (src && src !== canonicalSrc) candidates.push(withVersion(src));
  return [...new Set(candidates.filter(Boolean))];
}

export default function OptimizedImage({
  src,
  alt,
  className = '',
  priority = false,
  sizes,
  objectFit = 'contain',
}: Props) {
  const canonicalSrc = useMemo(() => resolveQuestionImageUrl(src), [src]);
  const candidates = useMemo(() => imageCandidates(src, canonicalSrc), [src, canonicalSrc]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
    setFailed(false);
  }, [canonicalSrc, src]);

  if (!canonicalSrc || !candidates.length) return null;

  const activeSrc = candidates[candidateIndex] ?? candidates[0];

  return (
    <div className={`relative ${className}`}>
      {!loaded && !failed && <div className="absolute inset-0 skeleton" aria-hidden="true" />}
      <img
        src={activeSrc}
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
            return;
          }
          setFailed(true);
          setLoaded(true);
        }}
        className={`block w-full h-full object-${objectFit} ${loaded ? '' : 'opacity-0'}`}
      />
      {failed && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted bg-paper p-3 text-center">
          تعذر تحميل الصورة
        </div>
      )}
    </div>
  );
}
