import { useEffect, useMemo, useState } from 'react';

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
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setSourceIndex(0);
  }, [src]);

  const sources = useMemo(() => {
    if (!src) return [];

    const result = [src];

    // بعض النسخ القديمة من البيانات تشير إلى /mechanic/mechanic_XXX.webp
    // بينما بعض ملفات الصور موجودة أيضاً داخل /signs.
    // نجرّب النسخ البديلة فقط عندما يكون المسار ميكانيكياً، حتى لا نعرض
    // صورة ميكانيك مكان إشارة مرورية صحيحة.
    const match = src.match(/(?:^|\/)mechanic(?:\/|_)?(?:mechanic_)?(\d+)\.webp$/i);

    if (match) {
      const number = match[1];

      result.push(`/signs/mechanic_${number}.webp`);
      result.push(`/signs/sign_${number}.webp`);
    }

    return [...new Set(result)];
  }, [src]);

  if (!src) return null;

  const currentSrc = sources[sourceIndex] ?? src;
  const isRaster = /\.(png|jpe?g)$/i.test(currentSrc);
  const webp = isRaster
    ? currentSrc.replace(/\.(png|jpe?g)$/i, '.webp')
    : undefined;

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setLoaded(false);
      setFailed(false);
      setSourceIndex((index) => index + 1);
      return;
    }

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

      <picture>
        {webp && (
          <source
            srcSet={webp}
            type="image/webp"
            sizes={sizes}
          />
        )}

        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={handleError}
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
