export type AgentFilter = "all" | "oss" | "custom";
export type ModelFilter = "all" | "open" | "proprietary";
export type TagFilter = "all" | "new" | "verified" | "open-source";

type LeaderboardFiltersProps = {
  agentFilter: AgentFilter;
  modelFilter: ModelFilter;
  tagFilter: TagFilter;
  searchQuery: string;
  onAgentFilterChange: (value: AgentFilter) => void;
  onModelFilterChange: (value: ModelFilter) => void;
  onTagFilterChange: (value: TagFilter) => void;
  onSearchQueryChange: (value: string) => void;
};

export function LeaderboardFilters({
  agentFilter,
  modelFilter,
  tagFilter,
  searchQuery,
  onAgentFilterChange,
  onModelFilterChange,
  onTagFilterChange,
  onSearchQueryChange,
}: LeaderboardFiltersProps) {
  return (
    <section className="filter-panel" aria-label="Leaderboard filters">
      <label className="field">
        <span>Search</span>
        <input
          aria-label="Search system, model, or organization"
          type="search"
          placeholder="Search systems, models, organizations"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Agent</span>
        <select
          value={agentFilter}
          onChange={(event) =>
            onAgentFilterChange(event.target.value as AgentFilter)
          }
        >
          <option value="all">All agents</option>
          <option value="oss">OSS agents</option>
          <option value="custom">Custom agent</option>
        </select>
      </label>
      <label className="field">
        <span>Models</span>
        <select
          value={modelFilter}
          onChange={(event) =>
            onModelFilterChange(event.target.value as ModelFilter)
          }
        >
          <option value="all">All models</option>
          <option value="open">Open source only</option>
          <option value="proprietary">Proprietary only</option>
        </select>
      </label>
      <label className="field">
        <span>Tags</span>
        <select
          value={tagFilter}
          onChange={(event) =>
            onTagFilterChange(event.target.value as TagFilter)
          }
        >
          <option value="all">All tags</option>
          <option value="new">New</option>
          <option value="verified">Verified</option>
          <option value="open-source">Open source</option>
        </select>
      </label>
    </section>
  );
}
