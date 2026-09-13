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

export default function OptimizedImage({
  src,
  alt,
  className = '',
  priority = false,
  sizes,
  objectFit = 'contain',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const canonicalSrc = useMemo(() => resolveQuestionImageUrl(src), [src]);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [canonicalSrc]);

  if (!canonicalSrc) return null;

  return (
    <div className={`relative ${className}`}>
      {!loaded && !failed && <div className="absolute inset-0 skeleton" aria-hidden="true" />}
      <img
        src={canonicalSrc}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => { setFailed(true); setLoaded(true); }}
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
