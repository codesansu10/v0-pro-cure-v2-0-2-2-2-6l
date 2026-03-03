const TK_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/1/13/Thyssenkrupp_AG_Logo_2015.svg";

/**
 * Official thyssenkrupp logo (2015 brand identity) loaded from Wikimedia Commons.
 *
 * Uses a plain <img> inside a fixed-size container with object-contain
 * so the full logo (rings + wordmark) is always visible without clipping.
 *
 * @param containerClassName - Tailwind classes for the outer wrapper (set width/height here)
 * @param invert - applies brightness-0 invert for white-on-dark / colored backgrounds
 */
export function TkLogo({
  containerClassName = "h-8 w-40",
  invert = false,
}: {
  containerClassName?: string;
  /** Set true for white logo on dark / colored backgrounds */
  invert?: boolean;
}) {
  return (
    <div className={`${containerClassName} shrink-0 overflow-visible`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TK_LOGO_URL}
        alt="thyssenkrupp logo"
        className={`h-full w-full object-contain ${invert ? "brightness-0 invert" : ""}`}
        crossOrigin="anonymous"
      />
    </div>
  );
}
