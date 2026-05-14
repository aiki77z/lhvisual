import { useMemo, useState } from "react";
import {
  benchmarks,
  leaderboardEntries,
  type BenchmarkName,
  type LeaderboardEntry,
} from "../../data/leaderboard";
import { ComparePanel } from "./ComparePanel";
import {
  LeaderboardFilters,
  type AgentFilter,
  type ModelFilter,
  type TagFilter,
} from "./LeaderboardFilters";
import { LeaderboardSummaryCards } from "./LeaderboardSummaryCards";
import { LeaderboardTable, type SortDirection, type SortKey } from "./LeaderboardTable";
import { LeaderboardTabs } from "./LeaderboardTabs";

function sortEntries(
  entries: LeaderboardEntry[],
  sortKey: SortKey,
  sortDirection: SortDirection,
) {
  return [...entries].sort((a, b) => {
    let result = 0;

    if (sortKey === "date") {
      result = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else {
      result = a[sortKey] - b[sortKey];
    }

    return sortDirection === "asc" ? result : -result;
  });
}

export function LeaderboardPage() {
  const [activeBenchmark, setActiveBenchmark] =
    useState<BenchmarkName>("Verified");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [modelFilter, setModelFilter] = useState<ModelFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("resolved");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = leaderboardEntries.filter((entry) => {
      const matchesBenchmark = entry.benchmark === activeBenchmark;
      const matchesAgent =
        agentFilter === "all" ||
        (agentFilter === "oss" && entry.oss) ||
        (agentFilter === "custom" && !entry.oss);
      const matchesModel =
        modelFilter === "all" ||
        (modelFilter === "open" && entry.oss) ||
        (modelFilter === "proprietary" && !entry.oss);
      const matchesTag =
        tagFilter === "all" ||
        entry.tags.includes(tagFilter) ||
        (tagFilter === "new" && Boolean(entry.isNew)) ||
        (tagFilter === "verified" && entry.verified);
      const searchableText = [
        entry.system,
        entry.model,
        entry.organization,
        entry.agent,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return (
        matchesBenchmark &&
        matchesAgent &&
        matchesModel &&
        matchesTag &&
        matchesSearch
      );
    });

    return sortEntries(filtered, sortKey, sortDirection);
  }, [
    activeBenchmark,
    agentFilter,
    modelFilter,
    tagFilter,
    searchQuery,
    sortKey,
    sortDirection,
  ]);

  const selectedEntries = leaderboardEntries.filter((entry) =>
    selectedIds.includes(entry.id),
  );

  const topScore = Math.max(...leaderboardEntries.map((entry) => entry.resolved));
  const sortedDates = leaderboardEntries.map((entry) => entry.date).sort();
  const latestDate = sortedDates[sortedDates.length - 1];

  const summaryItems = [
    {
      label: "Top Score",
      value: `${topScore.toFixed(2)}%`,
      detail: "Best resolved rate",
    },
    {
      label: "Total Submissions",
      value: `${leaderboardEntries.length}`,
      detail: "Mock leaderboard entries",
    },
    {
      label: "Benchmarks",
      value: `${benchmarks.length}`,
      detail: "Available benchmark splits",
    },
    {
      label: "Last Updated",
      value: latestDate ?? "N/A",
      detail: "Latest mock submission",
    },
  ];

  function handleSortChange(nextSortKey: SortKey) {
    if (nextSortKey === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "rank" ? "asc" : "desc");
  }

  function handleBenchmarkChange(benchmark: BenchmarkName) {
    setActiveBenchmark(benchmark);
    setSelectedIds([]);
  }

  function handleSelectionChange(entryId: string) {
    setSelectedIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  }

  return (
    <div className="site-container page-stack">
      <section className="leaderboard-hero">
        <div>
          <p className="eyebrow">Benchmark dashboard</p>
          <h1>Official Leaderboards</h1>
          <p className="subtitle">
            Track benchmark results across coding agents and model submissions.
          </p>
          <p className="lede">
            Each entry reports resolved percentage on benchmark instances.
          </p>
        </div>
        <LeaderboardSummaryCards items={summaryItems} />
      </section>

      <LeaderboardTabs
        benchmarks={benchmarks}
        activeBenchmark={activeBenchmark}
        onChange={handleBenchmarkChange}
      />

      <LeaderboardFilters
        agentFilter={agentFilter}
        modelFilter={modelFilter}
        tagFilter={tagFilter}
        searchQuery={searchQuery}
        onAgentFilterChange={setAgentFilter}
        onModelFilterChange={setModelFilter}
        onTagFilterChange={setTagFilter}
        onSearchQueryChange={setSearchQuery}
      />

      <ComparePanel selectedEntries={selectedEntries} />

      <section className="data-section" aria-labelledby="leaderboard-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Results</p>
            <h2 id="leaderboard-title">{activeBenchmark} submissions</h2>
          </div>
          <p>{filteredEntries.length} visible entries</p>
        </div>
        <LeaderboardTable
          entries={filteredEntries}
          selectedIds={selectedIds}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onSelectionChange={handleSelectionChange}
        />
      </section>
    </div>
  );
}
