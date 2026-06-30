type InfinityMarkProps = {
  size?: number;
  animate?: boolean;
  className?: string;
};

// A single closed path that morphs between a circle and a lemniscate.
// Both shapes are 4 cubic-bezier segments so the `d` values interpolate
// smoothly: circle -> twist into infinity -> untwist back to circle.
const CIRCLE =
  "M16 7 C20.97 7, 25 11.03, 25 16 C25 20.97, 20.97 25, 16 25 C11.03 25, 7 20.97, 7 16 C7 11.03, 11.03 7, 16 7 Z";
const INFINITY =
  "M16 16 C16 8, 4 8, 4 16 C4 24, 16 24, 16 16 C16 8, 28 8, 28 16 C28 24, 16 24, 16 16 Z";

export function InfinityMark({ size = 30, animate = false, className }: InfinityMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={animate ? CIRCLE : INFINITY}
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {animate ? (
          <animate
            attributeName="d"
            dur="5s"
            repeatCount="indefinite"
            keyTimes="0;0.4;0.5;0.6;1"
            values={`${CIRCLE};${INFINITY};${INFINITY};${INFINITY};${CIRCLE}`}
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0 0 1 1;0 0 1 1;0.45 0 0.55 1"
          />
        ) : null}
      </path>
    </svg>
  );
}
