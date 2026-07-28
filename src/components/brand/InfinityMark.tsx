import { useEffect, useRef } from "react";
import { TANGLED_TWIST, makeLoopFrame, twistAt, yawAt } from "../../lib/loopCurve";

type InfinityMarkProps = {
  size?: number;
  animate?: boolean;
  className?: string;
};

const tangled = makeLoopFrame(TANGLED_TWIST, 0);

export const INFINITY_MARK_PATH = tangled.path;

// One loop of line, folded. Held open it is a ring; folded to the end it is the infinity,
// crossing once at its centre. The far half of the line is drawn first and the near half over
// it, so the crossing is a real over and under and the mark reads as a line rather than as a
// shape being reshaped.
export function InfinityMark({ size = 30, animate = false, className }: InfinityMarkProps) {
  const backRef = useRef<SVGPathElement | null>(null);
  const frontRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    // A shared clock keeps every mark on the page at the same point of the fold.
    const render = (now: number) => {
      const frame = makeLoopFrame(twistAt(now), yawAt(now));
      backRef.current?.setAttribute("d", frame.back);
      frontRef.current?.setAttribute("d", frame.front);
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
        ref={backRef}
        d={tangled.back}
        stroke="currentColor"
        strokeOpacity={0.42}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        ref={frontRef}
        d={tangled.front}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
