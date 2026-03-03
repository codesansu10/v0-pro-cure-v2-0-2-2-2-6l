export function TkLogo({ className = "", color = "white" }: { className?: string; color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 110 85"
      className={className}
      aria-label="thyssenkrupp logo"
      role="img"
    >
      {/* The thyssenkrupp logo: two interlocking rings with "thyssenkrupp" text below */}
      <g fill={color}>
        {/* Upper ring */}
        <path d="M55 4C40.088 4 28 14.745 28 28c0 13.255 12.088 24 27 24s27-10.745 27-24C82 14.745 69.912 4 55 4zm0 6c11.598 0 21 8.059 21 18s-9.402 18-21 18-21-8.059-21-18S43.402 10 55 10z" />
        {/* Lower ring - offset and overlapping */}
        <path d="M55 33C40.088 33 28 43.745 28 57c0 13.255 12.088 24 27 24s27-10.745 27-24C82 43.745 69.912 33 55 33zm0 6c11.598 0 21 8.059 21 18s-9.402 18-21 18-21-8.059-21-18S43.402 39 55 39z" />
      </g>
    </svg>
  );
}
