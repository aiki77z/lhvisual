type BadgeTone = "neutral" | "success" | "info" | "warning";

type LeaderboardBadgeProps = {
  children: string;
  tone?: BadgeTone;
};

export function LeaderboardBadge({
  children,
  tone = "neutral",
}: LeaderboardBadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
