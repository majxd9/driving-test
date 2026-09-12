import { useEffect, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover';
};

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

  if (!src) return null;

  const isRaster = /\.(png|jpe?g)$/i.test(src);
  const webp = isRaster ? src.replace(/\.(png|jpe?g)$/i, '.webp') : undefined;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && !failed && <div className="absolute inset-0 skeleton" aria-hidden="true" />}
      <picture>
        {webp && <source srcSet={webp} type="image/webp" sizes={sizes} />}
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => { setFailed(true); setLoaded(true); }}
          className={`block w-full h-full object-${objectFit} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </picture>
      {failed && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted bg-paper">
          تعذر تحميل الصورة
        </div>
      )}
    </div>
  );
}
