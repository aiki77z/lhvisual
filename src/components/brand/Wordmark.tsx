import { InfinityMark } from "./InfinityMark";

type WordmarkProps = {
  className?: string;
};

// Renders "L∞psBench": the infinity glyph stands in for the double-o of Loops.
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={`wordmark ${className ?? ""}`} role="img" aria-label="LoopsBench">
      L
      <InfinityMark size={22} className="wordmark-inf" />
      psBench
    </span>
  );
}
