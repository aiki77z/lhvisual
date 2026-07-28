import { useEffect, useRef } from "react";
import { LOOP_PERIOD, TANGLED_TWIST, loopPath, twistAt } from "../../lib/loopCurve";

type InfinityMarkProps = {
  size?: number;
  animate?: boolean;
  className?: string;
};

export const INFINITY_MARK_PATH = loopPath(TANGLED_TWIST);
export { LOOP_PERIOD };

// The mark is one closed curve in space, drawn each frame as it turns. Face on it reads as a
// ring; a quarter turn on it reads as the infinity. Nothing morphs, so the shape stays honest
// at every angle and the turn has no seam to give the loop away.
export function InfinityMark({ size = 30, animate = false, className }: InfinityMarkProps) {
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    // A shared clock keeps every mark on the page at the same angle.
    const render = (now: number) => {
      pathRef.current?.setAttribute("d", loopPath(twistAt(now)));
      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(raf);
  }, [animate]);

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
        ref={pathRef}
        d={INFINITY_MARK_PATH}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
