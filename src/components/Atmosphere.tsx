/**
 * Film grain and scanlines. Both are fixed, non-interactive and under 4%
 * opacity — texture that reads as an unlit monitor, not visible noise.
 * Justified by the brief: he shoots motion and stills.
 */
export default function Atmosphere() {
  return (
    <>
      <div className="grain-layer" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
    </>
  );
}
