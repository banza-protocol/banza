// The single canonical BanzAI mark used across the whole site. It is the SAME glyph the /banzai surface
// renders via <Ico name="sparkle"> (components/banzai/banzaiUi.tsx) — the two-part sparkle with the small
// twinkle accent — so the nav, the home surfaces and the /banzai page all show one official BanzAI mark
// instead of a look-alike star. Dependency-free (a pure inline SVG, no hooks) so it can be used from any
// server or client component without pulling the BanzAI UI bundle. Any surface that needs the BanzAI icon
// must use THIS component; the old plain 4-point star glyph is retired and guard-blocked
// (tools/check-banzai-mark-consistency.sh).

export function BanzaiMark({
  size = 18,
  color = "currentColor",
  sw = 1.5,
  className = "",
}: {
  size?: number;
  color?: string;
  sw?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3l1.7 5.1a2 2 0 0 0 1.2 1.2L20 11l-5.1 1.7a2 2 0 0 0-1.2 1.2L12 19l-1.7-5.1a2 2 0 0 0-1.2-1.2L4 11l5.1-1.7a2 2 0 0 0 1.2-1.2z" />
      <path d="M19 4v3M20.5 5.5h-3" />
    </svg>
  );
}
