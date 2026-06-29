import { InfinityMark } from "./InfinityMark";

type WordmarkProps = {
  // when true the oo becomes an inline infinity glyph
  className?: string;
};

// Renders "Lo∞ps" where the double-o is an inline lemniscate.
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={`wordmark ${className ?? ""}`}>
      Lo
      <InfinityMark size={22} className="wordmark-inf" />
      ps
    </span>
  );
}
