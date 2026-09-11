import { useState } from 'react';

export default function OptimizedImage({ src, alt, className = '', priority = false, sizes }: {
  src: string; alt: string; className?: string; priority?: boolean; sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  if (!src) return null;
  const isRaster = /\.(png|jpe?g)$/i.test(src);
  const webp = isRaster ? src.replace(/\.(png|jpe?g)$/i, '.webp') : undefined;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="absolute inset-0 skeleton" aria-hidden="true" />}
      <picture>
        {webp && <source srcSet={webp} type="image/webp" sizes={sizes} />}
        <img
          src={src}
          alt={alt}
          width={640}
          height={640}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </picture>
    </div>
  );
}
