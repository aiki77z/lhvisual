import { InfinityMark } from "./InfinityMark";

type WordmarkProps = {
  className?: string;
};

// Renders "l∞p": the infinity glyph stands in for the double-o of "loop".
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={`wordmark ${className ?? ""}`}>
      l
      <InfinityMark size={22} className="wordmark-inf" />
      p
    </span>
  );
}
