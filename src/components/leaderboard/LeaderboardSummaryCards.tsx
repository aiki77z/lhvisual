type SummaryItem = {
  label: string;
  value: string;
  detail: string;
};

type LeaderboardSummaryCardsProps = {
  items: SummaryItem[];
};

export function LeaderboardSummaryCards({ items }: LeaderboardSummaryCardsProps) {
  return (
    <div className="summary-grid" aria-label="Leaderboard summary">
      {items.map((item) => (
        <article className="summary-card" key={item.label}>
          <p>{item.label}</p>
          <strong>{item.value}</strong>
          <span>{item.detail}</span>
        </article>
      ))}
    </div>
  );
}
