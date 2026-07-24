type InfinityMarkProps = {
  size?: number;
  animate?: boolean;
  className?: string;
};

export const INFINITY_MARK_PATH =
  "M21 16 C21 8, 4 8, 4 16 C4 24, 21 24, 21 16 C21 8, 38 8, 38 16 C38 24, 21 24, 21 16 Z";

// The top-left mark is the visual grammar for the homepage loop graphic:
// a clean infinity glyph with a small moving particle on the path.
export function InfinityMark({ size = 30, animate = false, className }: InfinityMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 42 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={INFINITY_MARK_PATH}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {animate ? (
        <g>
          <animateMotion dur="5.8s" repeatCount="indefinite" path={INFINITY_MARK_PATH} />
          <circle r={5.2} fill="currentColor" opacity={0.24} />
          <circle r={2.45} fill="#eef8ff" />
        </g>
      ) : null}
    </svg>
  );
}
