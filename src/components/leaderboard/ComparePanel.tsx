import type { LeaderboardEntry } from "../../data/leaderboard";

type ComparePanelProps = {
  selectedEntries: LeaderboardEntry[];
};

export function ComparePanel({ selectedEntries }: ComparePanelProps) {
  return (
    <section className="compare-panel" aria-labelledby="compare-title">
      <div>
        <p className="eyebrow">Compare results</p>
        <h2 id="compare-title">Submission comparison</h2>
        {selectedEntries.length > 0 ? (
          <p>
            {selectedEntries.map((entry) => entry.system).join(", ")} selected
            for comparison.
          </p>
        ) : (
          <p>
            Select models via the checkboxes, then click Compare results.
          </p>
        )}
      </div>
      <button className="button-secondary" type="button">
        Compare selected ({selectedEntries.length})
      </button>
    </section>
  );
}
