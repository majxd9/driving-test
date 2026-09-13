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

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const canonicalSrc = useMemo(() => resolveQuestionImageUrl(src), [src]);

  if (!canonicalSrc) return null;

  const handleError = () => {
    setFailed(true);
    setLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !failed && (
        <div
          className="absolute inset-0 skeleton"
          aria-hidden="true"
        />
      )}

      <img
        src={canonicalSrc}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={`block w-full h-full object-${objectFit} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {failed && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted bg-paper">
          تعذر تحميل الصورة من المصدر الأساسي
        </div>
      )}
    </div>
  );
}
