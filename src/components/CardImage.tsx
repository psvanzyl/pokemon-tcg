"use client";

import { useEffect, useState } from "react";

/**
 * Card scan with a graceful fallback.
 *
 * A handful of very old promo prints have no surviving scan on the TCGplayer CDN — S3 answers
 * `403 AccessDenied` for those product ids — and TCGdex has no replacement, so the browser would
 * otherwise paint a broken-image icon into the tile. Instead we swap in a neutral placeholder that
 * keeps the tile's geometry (and its accessible name) intact, so the grid still reads as finished.
 * `fallbackClassName` carries the box the caller's layout needs when the placeholder cannot inherit
 * it from the `<img>` (the card hero, whose height normally comes from the scan's own aspect ratio).
 * The state resets when `src` changes so a recycled node re-tries the scan it is handed next.
 */
export default function CardImage({
  src,
  alt,
  className,
  fallbackClassName,
  srcSet,
  sizes,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  srcSet?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    // Decorative callers pass alt="" — the placeholder stays silent for them.
    return (
      <span
        role={alt ? "img" : undefined}
        aria-hidden={alt ? undefined : true}
        aria-label={alt ? `${alt} — no scan available` : undefined}
        className={`flex items-center justify-center text-muted ${className ?? ""} ${fallbackClassName ?? ""}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-1/3 max-h-9 w-auto"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          <rect x="3.2" y="2.4" width="17.6" height="19.2" rx="2.4" opacity="0.5" />
          <circle cx="12" cy="12" r="3.1" opacity="0.7" />
          <path d="M3.2 12h5.7M15.1 12h5.7" opacity="0.7" />
        </svg>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      onError={() => setBroken(true)}
      className={className}
    />
  );
}
