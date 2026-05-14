import type { BenchmarkName } from "../../data/leaderboard";

type LeaderboardTabsProps = {
  benchmarks: BenchmarkName[];
  activeBenchmark: BenchmarkName;
  onChange: (benchmark: BenchmarkName) => void;
};

export function LeaderboardTabs({
  benchmarks,
  activeBenchmark,
  onChange,
}: LeaderboardTabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Benchmark splits">
      {benchmarks.map((benchmark) => (
        <button
          key={benchmark}
          type="button"
          role="tab"
          aria-selected={activeBenchmark === benchmark}
          className={activeBenchmark === benchmark ? "tab active" : "tab"}
          onClick={() => onChange(benchmark)}
        >
          {benchmark}
        </button>
      ))}
    </div>
  );
}
