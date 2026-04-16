import { useEffect, useMemo, useState } from 'react';

export default function ProductImageCarousel({
  images,
  alt,
  className = '',
  heightClassName = 'h-40',
  imageClassName = 'object-cover',
  showDots = true,
  showCounter = true
}) {
  const normalizedImages = useMemo(
    () => (Array.isArray(images) ? images.filter(Boolean) : []),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const hasImages = normalizedImages.length > 0;
  const isCarousel = normalizedImages.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedImages.length]);

  const goPrev = () => {
    if (!isCarousel) {
      return;
    }
    setActiveIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
  };

  const goNext = () => {
    if (!isCarousel) {
      return;
    }
    setActiveIndex((prev) => (prev + 1) % normalizedImages.length);
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] ${heightClassName} ${className}`}>
      {hasImages ? (
        <img
          src={normalizedImages[activeIndex]}
          alt={alt}
          className={`h-full w-full ${imageClassName}`}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[var(--muted-ink)]">
          No image
        </div>
      )}

      {isCarousel ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-white/40 bg-black/45 text-sm text-white"
            aria-label="Previous image"
          >
            {'<'}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border border-white/40 bg-black/45 text-sm text-white"
            aria-label="Next image"
          >
            {'>'}
          </button>
          {showCounter ? (
            <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white">
              {activeIndex + 1}/{normalizedImages.length}
            </span>
          ) : null}
          {showDots ? (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-2 py-1">
              {normalizedImages.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to image ${index + 1}`}
                  className={`h-1.5 w-1.5 rounded-full ${index === activeIndex ? 'bg-white' : 'bg-white/45'}`}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
