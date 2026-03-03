import Image from "next/image";

/**
 * thyssenkrupp official logo (2015 brand identity).
 * Renders the actual SVG from /public/thyssenkrupp-logo.svg.
 *
 * For white-on-dark contexts, use `invert` to flip the color.
 */
export function TkLogo({
  className = "",
  invert = false,
}: {
  className?: string;
  /** Set true for white logo on dark / colored backgrounds */
  invert?: boolean;
}) {
  return (
    <Image
      src="/thyssenkrupp-logo.svg"
      alt="thyssenkrupp logo"
      width={110}
      height={85}
      className={`${className} ${invert ? "brightness-0 invert" : ""}`}
      priority
    />
  );
}
