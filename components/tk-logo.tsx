/**
 * thyssenkrupp logo (2015 brand identity)
 * Two interlocking rings (Thyssen top, Krupp bottom) + optional wordmark.
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
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 154"
        className={className}
        aria-label="thyssenkrupp logo"
        role="img"
      >
        <g fill={color}>
          <path d="M100 0C79.013 0 62 16.341 62 36.5S79.013 73 100 73s38-16.341 38-36.5S120.987 0 100 0zm0 8c16.569 0 30 12.759 30 28.5S116.569 65 100 65 70 52.241 70 36.5 83.431 8 100 8z" />
          <path d="M100 39C79.013 39 62 55.341 62 75.5S79.013 112 100 112s38-16.341 38-36.5S120.987 39 100 39zm0 8c16.569 0 30 12.759 30 28.5S116.569 104 100 104 70 91.241 70 75.5 83.431 47 100 47z" />
          <text
            x="100"
            y="148"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="22"
            fontWeight="400"
            letterSpacing="1.5"
          >
            thyssenkrupp
          </text>
        </g>
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 76 112"
      className={className}
      aria-label="thyssenkrupp logo"
      role="img"
    >
      <g fill={color}>
        {/* Upper ring (Thyssen) */}
        <path d="M38 0C17.013 0 0 16.341 0 36.5S17.013 73 38 73s38-16.341 38-36.5S58.987 0 38 0zm0 8c16.569 0 30 12.759 30 28.5S54.569 65 38 65 8 52.241 8 36.5 21.431 8 38 8z" />
        {/* Lower ring (Krupp) */}
        <path d="M38 39C17.013 39 0 55.341 0 75.5S17.013 112 38 112s38-16.341 38-36.5S58.987 39 38 39zm0 8c16.569 0 30 12.759 30 28.5S54.569 104 38 104 8 91.241 8 75.5 21.431 47 38 47z" />
      </g>
    </svg>
  );
}
