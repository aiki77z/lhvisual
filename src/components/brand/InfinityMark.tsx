import { useEffect, useRef } from "react";
import { TANGLED_TWIST, makeLoopFrame, twistAt, yawAt } from "../../lib/loopCurve";

type InfinityMarkProps = {
  size?: number;
  animate?: boolean;
  className?: string;
};

const tangled = makeLoopFrame(TANGLED_TWIST, 0);

export const INFINITY_MARK_PATH = tangled.path;

// One loop of line, turned about its own long axis. The far half of the line is drawn first and
// the near half over it, both in the one colour, so the mark reads as a single continuous piece
// of material rather than as two strands of differing weight.
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
