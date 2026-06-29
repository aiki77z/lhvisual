type InfinityMarkProps = {
  size?: number;
  animate?: boolean;
  className?: string;
};

// Lemniscate drawn as a single continuous path. When animate is on, a short
// dash travels the loop to read as a repeating cycle.
export function InfinityMark({ size = 30, animate = false, className }: InfinityMarkProps) {
  const d =
    "M16 16 C16 8, 4 8, 4 16 C4 24, 16 24, 16 16 C16 8, 28 8, 28 16 C28 24, 16 24, 16 16 Z";
  return (
    <svg
      className={className}
      width={size}
      height={(size * 32) / 32}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={animate ? 0.28 : 1}
      />
      {animate ? (
        <path
          className="infinity-trace"
          d={d}
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          pathLength={100}
        />
      ) : null}
    </svg>
  );
}
