type InfinityMarkProps = {
  size?: number;
  animate?: boolean;
  className?: string;
};

export const INFINITY_MARK_PATH =
  "M21 16 C21 8, 4 8, 4 16 C4 24, 21 24, 21 16 C21 8, 38 8, 38 16 C38 24, 21 24, 21 16 Z";
const CIRCLE =
  "M21 7 C25.97 7, 30 11.03, 30 16 C30 20.97, 25.97 25, 21 25 C16.03 25, 12 20.97, 12 16 C12 11.03, 16.03 7, 21 7 Z";

// A single closed path that morphs between a circle and a lemniscate.
// The homepage diagram reuses the lemniscate path, but the logo itself stays clean.
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
        d={animate ? CIRCLE : INFINITY_MARK_PATH}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {animate ? (
          <animate
            attributeName="d"
            dur="9s"
            repeatCount="indefinite"
            keyTimes="0;0.4;0.5;0.6;1"
            values={`${CIRCLE};${INFINITY_MARK_PATH};${INFINITY_MARK_PATH};${INFINITY_MARK_PATH};${CIRCLE}`}
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0 0 1 1;0 0 1 1;0.45 0 0.55 1"
          />
        ) : null}
      </path>
    </svg>
  );
}
