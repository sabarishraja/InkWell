/**
 * GrainOverlay.tsx — SVG grain texture overlay + filter definition.
 *
 * The feTurbulence filter must be defined once in the document.
 * The .grain-overlay div applies it via filter: url(#grain).
 * Rendered once in App.tsx so it covers every page.
 */

export function GrainOverlay() {
  return (
    <>
      {/* SVG filter definition — invisible, just registers the filter ID */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <defs>
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* Grain overlay div — uses the filter above */}
      <div className="grain-overlay" aria-hidden="true" />
    </>
  );
}
