import type { LeaderboardEntry } from "../../data/leaderboard";
import { LeaderboardBadge } from "./LeaderboardBadge";

export type SortKey = "rank" | "resolved" | "date";
export type SortDirection = "asc" | "desc";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  selectedIds: string[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (sortKey: SortKey) => void;
  onSelectionChange: (entryId: string) => void;
};

function rankLabel(rank: number) {
  if (rank === 1) {
    return "1st";
  }

  if (rank === 2) {
    return "2nd";
  }

  if (rank === 3) {
    return "3rd";
  }

  return `${rank}`;
}

function SortButton({
  children,
  active,
  direction,
  onClick,
}: {
  children: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button className="sort-button" type="button" onClick={onClick}>
      {children}
      <span aria-hidden="true">{active ? (direction === "asc" ? "up" : "down") : ""}</span>
    </button>
  );
}

export function LeaderboardTable({
  entries,
  selectedIds,
  sortKey,
  sortDirection,
  onSortChange,
  onSelectionChange,
}: LeaderboardTableProps) {
  return (
    <div className="table-frame">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th scope="col" className="select-column">
              Select
            </th>
            <th scope="col">
              <SortButton
                active={sortKey === "rank"}
                direction={sortDirection}
                onClick={() => onSortChange("rank")}
              >
                Rank
              </SortButton>
            </th>
            <th scope="col">System / Agent</th>
            <th scope="col">Model</th>
            <th scope="col">Benchmark</th>
            <th scope="col" className="numeric">
              <SortButton
                active={sortKey === "resolved"}
                direction={sortDirection}
                onClick={() => onSortChange("resolved")}
              >
                Resolved
              </SortButton>
            </th>
            <th scope="col">Verified</th>
            <th scope="col">OSS</th>
            <th scope="col">
              <SortButton
                active={sortKey === "date"}
                direction={sortDirection}
                onClick={() => onSortChange("date")}
              >
                Date
              </SortButton>
            </th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="select-column">
                <input
                  aria-label={`Select ${entry.system}`}
                  type="checkbox"
                  checked={selectedIds.includes(entry.id)}
                  onChange={() => onSelectionChange(entry.id)}
                />
              </td>
              <td>
                <span className={entry.rank <= 3 ? "rank-badge" : ""}>
                  {rankLabel(entry.rank)}
                </span>
              </td>
              <td>
                <div className="system-cell">
                  <strong>{entry.system}</strong>
                  <span>{entry.agent}</span>
                  <small>{entry.organization}</small>
                </div>
              </td>
              <td>{entry.model}</td>
              <td>{entry.benchmark}</td>
              <td className="numeric resolved-value">
                {entry.resolved.toFixed(2)}%
              </td>
              <td>
                {entry.verified ? (
                  <LeaderboardBadge tone="success">Verified</LeaderboardBadge>
                ) : (
                  <LeaderboardBadge>Submitted</LeaderboardBadge>
                )}
              </td>
              <td>
                {entry.oss ? (
                  <LeaderboardBadge tone="info">Open source</LeaderboardBadge>
                ) : (
                  <LeaderboardBadge>Closed</LeaderboardBadge>
                )}
              </td>
              <td>{entry.date}</td>
              <td>
                <div className="details-cell">
                  {entry.isNew ? (
                    <LeaderboardBadge tone="warning">New</LeaderboardBadge>
                  ) : null}
                  <a href={entry.detailsUrl ?? "#details"}>Details</a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 ? (
        <p className="empty-state">No submissions match the current filters.</p>
      ) : null}
    </div>
  );
}
