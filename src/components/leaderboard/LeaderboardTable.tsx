import type { LeaderboardEntry, SweepName } from "../../data/leaderboard";
import { LeaderboardBadge } from "./LeaderboardBadge";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  sweep: SweepName;
};

export function LeaderboardTable({ entries, sweep }: LeaderboardTableProps) {
  const primaryHeading = sweep === "model" ? "Model" : "Agent / Loop";
  const secondaryHeading = sweep === "model" ? "Loop" : "Model";

  return (
    <div className="table-frame">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{primaryHeading}</th>
            <th>{secondaryHeading}</th>
            <th className="numeric">RR w/o loop</th>
            <th className="numeric">RR w/ loop</th>
            <th className="numeric">TPR w/ loop</th>
            <th className="numeric">Depth</th>
            <th className="numeric">Tokens</th>
            <th>License</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <span className={entry.rank <= 3 ? "rank-badge" : ""}>{entry.rank}</span>
              </td>
              <td>
                <strong>{sweep === "model" ? entry.model : entry.loop}</strong>
              </td>
              <td>
                <span className="muted-table-value">{sweep === "model" ? entry.loop : entry.model}</span>
              </td>
              <td className="numeric">{entry.rrBase.toFixed(2)}%</td>
              <td className="numeric resolved-value">{entry.rrLoop.toFixed(2)}%</td>
              <td className="numeric">{entry.tprLoop.toFixed(2)}%</td>
              <td className="numeric">{entry.depth.toFixed(2)}</td>
              <td className="numeric">{entry.tokens.toFixed(2)}M</td>
              <td>
                {entry.oss ? (
                  <LeaderboardBadge tone="info">Open</LeaderboardBadge>
                ) : (
                  <LeaderboardBadge>Closed</LeaderboardBadge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
