/**
 * thyssenkrupp logo (2015 brand identity)
 * Two interlocking rings (Thyssen top, Krupp bottom) + optional wordmark.
 *
 * The icon-only variant uses a square-ish viewBox so it renders fully
 * visible even inside small containers constrained by height.
 */
export function TkLogo({
  className = "",
  color = "currentColor",
  showWordmark = false,
}: {
  className?: string;
  color?: string;
  showWordmark?: boolean;
}) {
  if (showWordmark) {
    /* Full logo with "thyssenkrupp" wordmark below the rings */
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 154"
        className={className}
        aria-label="thyssenkrupp logo"
        role="img"
        fill="none"
      >
        <g fill={color}>
          {/* Upper ring (Thyssen) */}
          <path d="M100 4a34 34 0 1 0 0 68 34 34 0 1 0 0-68zm0 7a27 27 0 1 1 0 54 27 27 0 1 1 0-54z" />
          {/* Lower ring (Krupp) */}
          <path d="M100 42a34 34 0 1 0 0 68 34 34 0 1 0 0-68zm0 7a27 27 0 1 1 0 54 27 27 0 1 1 0-54z" />
          <text
            x="100"
            y="146"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="20"
            fontWeight="400"
            letterSpacing="1.2"
          >
            thyssenkrupp
          </text>
        </g>
      </svg>
    );
  }

  /* Icon-only: two interlocking rings in a near-square viewBox */
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 68 106"
      className={className}
      aria-label="thyssenkrupp logo"
      role="img"
      fill="none"
    >
      <g fill={color}>
        {/* Upper ring (Thyssen) */}
        <path d="M34 0a34 34 0 1 0 0 68 34 34 0 1 0 0-68zm0 7a27 27 0 1 1 0 54 27 27 0 1 1 0-54z" />
        {/* Lower ring (Krupp) */}
        <path d="M34 38a34 34 0 1 0 0 68 34 34 0 1 0 0-68zm0 7a27 27 0 1 1 0 54 27 27 0 1 1 0-54z" />
      </g>
    </svg>
  );
}
