import type { LeaderboardEntry } from "../../data/leaderboard";
import { LeaderboardBadge } from "./LeaderboardBadge";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="table-frame">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Model / Loop</th>
            <th className="numeric">RR w/o loop</th>
            <th className="numeric">RR w/ loop</th>
            <th className="numeric">TPR w/ loop</th>
            <th className="numeric">Depth</th>
            <th className="numeric">Tokens</th>
            <th>License</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>
                <span className={e.rank <= 3 ? "rank-badge" : ""}>{e.rank}</span>
              </td>
              <td>
                <strong>{e.model}</strong> · {e.loop}
              </td>
              <td className="numeric">{e.rrBase.toFixed(2)}%</td>
              <td className="numeric resolved-value">{e.rrLoop.toFixed(2)}%</td>
              <td className="numeric">{e.tprLoop.toFixed(2)}%</td>
              <td className="numeric">{e.depth.toFixed(2)}</td>
              <td className="numeric">{e.tokens.toFixed(2)}M</td>
              <td>
                {e.oss ? (
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
