import type { SVGProps } from "react";

/**
 * The Carddex mark: a Poké Ball seen from the front — red upper hemisphere,
 * white lower hemisphere, black equator, black outline and the centre button.
 * Fixed colours on purpose: the ball is red/white/black in both themes.
 */
export default function PokeBall({ className = "h-8 w-8", ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Carddex"
      focusable="false"
      {...rest}
    >
      <defs>
        <clipPath id="carddex-ball">
          <circle cx="16" cy="16" r="15" />
        </clipPath>
      </defs>

      <g clipPath="url(#carddex-ball)">
        {/* lower hemisphere */}
        <rect x="0" y="16" width="32" height="16" fill="#ffffff" />
        {/* upper hemisphere */}
        <rect x="0" y="0" width="32" height="16" fill="#e3342f" />
        {/* black equator */}
        <rect x="0" y="14.7" width="32" height="2.6" fill="#111114" />
        {/* gloss on the red half */}
        <ellipse cx="11.4" cy="7.6" rx="5.4" ry="2.6" fill="#ffffff" opacity="0.3" transform="rotate(-22 11.4 7.6)" />
      </g>

      {/* outline */}
      <circle cx="16" cy="16" r="14.9" fill="none" stroke="#111114" strokeWidth="2.2" />

      {/* centre button */}
      <circle cx="16" cy="16" r="5.2" fill="#111114" />
      <circle cx="16" cy="16" r="3.4" fill="#ffffff" />
    </svg>
  );
}
