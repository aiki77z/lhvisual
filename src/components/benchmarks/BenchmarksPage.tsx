import { useEffect, useState } from "react";
import { DagLayerBars } from "./DagLayerBars";
import { getBenchmarksIndex } from "../../lib/benchmarksApi";
import { toAppPath } from "../../lib/site";
import type {
  BenchmarkFilterOption,
  BenchmarkTaskSummary,
  BenchmarksIndexPayload,
} from "../../types/benchmarks";

type FilterState = {
  query: string;
  categories: string[];
  tags: string[];
  difficulties: string[];
};

type FilterMenuProps = {
  label: string;
  queryLabel: string;
  options: BenchmarkFilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
};

function uniqSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function readFiltersFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("q") ?? "",
    categories: uniqSorted(params.getAll("category")),
    tags: uniqSorted(params.getAll("tag")),
    difficulties: uniqSorted(params.getAll("difficulty")),
  };
}

function writeFiltersToUrl(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  filters.categories.forEach((value) => params.append("category", value));
  filters.tags.forEach((value) => params.append("tag", value));
  filters.difficulties.forEach((value) => params.append("difficulty", value));
  const path = toAppPath("/benchmarks");
  const nextUrl = params.toString() ? `${path}?${params.toString()}` : path;
  window.history.replaceState(null, "", nextUrl);
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : uniqSorted([...values, value]);
}

function formatDifficulty(value: string) {
  return value.replace(/_/g, " ");
}

function FilterMenu({
  label,
  queryLabel,
  options,
  selected,
  onToggle,
  searchable = false,
}: FilterMenuProps) {
  const [localQuery, setLocalQuery] = useState("");
  const selectedSet = new Set(selected);
  const normalizedQuery = localQuery.trim().toLowerCase();
  const defaultLimit = 60;
  const visibleOptions = options.filter((option, index) => {
    if (normalizedQuery) {
      return option.value.toLowerCase().includes(normalizedQuery);
    }
    return selectedSet.has(option.value) || index < defaultLimit;
  });

  return (
    <details className="benchmark-filter-menu">
      <summary>
        <span>{selected.length > 0 ? `${label} · ${selected.length}` : `Select ${queryLabel}`}</span>
      </summary>
      <div className="benchmark-filter-panel">
        {searchable ? (
          <input
            className="benchmark-filter-search"
            type="search"
            value={localQuery}
            placeholder={`Search ${queryLabel}`}
            onChange={(event) => setLocalQuery(event.target.value)}
          />
        ) : null}
        <div className="benchmark-filter-options">
          {visibleOptions.map((option) => (
            <label className="benchmark-filter-option" key={option.value}>
              <input
                type="checkbox"
                checked={selectedSet.has(option.value)}
                onChange={() => onToggle(option.value)}
              />
              <span>{option.value}</span>
              <small>{option.count}</small>
            </label>
          ))}
          {!visibleOptions.length ? (
            <p className="benchmark-filter-empty">No {queryLabel} match the current search.</p>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function TaskCard({ task }: { task: BenchmarkTaskSummary }) {
  const taskHref = toAppPath(`/benchmarks/${encodeURIComponent(task.id)}`);
  return (
    <article className="benchmark-card">
      <div className="benchmark-card-header">
        <div>
          <p className="benchmark-card-task-id">{task.taskName}</p>
          <h2>
            <a href={taskHref}>{task.title}</a>
          </h2>
        </div>
        <a className="benchmark-inline-link" href={task.repoUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>

      <div className="benchmark-badges">
        <span className="benchmark-badge">{task.category}</span>
        <span className="benchmark-badge">{formatDifficulty(task.difficulty)}</span>
      </div>

      <p className="benchmark-card-summary">{task.summary}</p>

      <div className="benchmark-card-metrics">
        <span>{task.moduleNodeCount.toLocaleString()} modules</span>
        <span>{task.unitCount.toLocaleString()} units</span>
        <span>{task.unitLayerCount.toLocaleString()} layers</span>
      </div>

      <DagLayerBars layers={task.dagPreview.unitLayers} compact />

      <p className="benchmark-card-tags">
        {task.tags.slice(0, 4).join(" · ")}
        {task.tags.length > 4 ? ` · +${task.tags.length - 4}` : ""}
      </p>

      <div className="benchmark-card-footer">
        <span>Created by {task.authorName}</span>
        <a className="benchmark-card-link" href={taskHref}>
          Open task
        </a>
      </div>
    </article>
  );
}

export function BenchmarksPage() {
  const [payload, setPayload] = useState<BenchmarksIndexPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialFilters = readFiltersFromUrl();
  const [query, setQuery] = useState(initialFilters.query);
  const [selectedCategories, setSelectedCategories] = useState(initialFilters.categories);
  const [selectedTags, setSelectedTags] = useState(initialFilters.tags);
  const [selectedDifficulties, setSelectedDifficulties] = useState(initialFilters.difficulties);

  useEffect(() => {
    void getBenchmarksIndex()
      .then((nextPayload) => {
        setPayload(nextPayload);
        setError(null);
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : "Failed to load benchmarks.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    writeFiltersToUrl({
      query,
      categories: selectedCategories,
      tags: selectedTags,
      difficulties: selectedDifficulties,
    });
  }, [query, selectedCategories, selectedTags, selectedDifficulties]);

  const filteredTasks = (payload?.tasks ?? []).filter((task) => {
    const searchNeedle = query.trim().toLowerCase();
    if (searchNeedle) {
      const haystack = [
        task.id,
        task.taskName,
        task.title,
        task.summary,
        task.category,
        task.authorName,
        ...task.tags,
      ]
        .join("\n")
        .toLowerCase();
      if (!haystack.includes(searchNeedle)) {
        return false;
      }
    }

    if (selectedCategories.length > 0 && !selectedCategories.includes(task.category)) {
      return false;
    }
    if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(task.difficulty)) {
      return false;
    }
    if (selectedTags.length > 0 && !selectedTags.some((tag) => task.tags.includes(tag))) {
      return false;
    }

    return true;
  });

  const hasActiveFilters =
    Boolean(query.trim()) ||
    selectedCategories.length > 0 ||
    selectedTags.length > 0 ||
    selectedDifficulties.length > 0;

  const summaryCards = payload
    ? [
        {
          label: "Tasks",
          value: payload.benchmark.taskCount.toLocaleString(),
          detail: "dependency-native task bundles",
        },
        {
          label: "Development Units",
          value: payload.benchmark.totalUnits.toLocaleString(),
          detail: `${payload.benchmark.totalTestedUnits.toLocaleString()} directly test-coupled`,
        },
        {
          label: "Median Unit Depth",
          value: payload.benchmark.medianUnitLayers.toLocaleString(),
          detail: `${payload.benchmark.categoryCount.toLocaleString()} categories`,
        },
        {
          label: "Tags",
          value: payload.benchmark.tagCount.toLocaleString(),
          detail: "searchable task signals",
        },
      ]
    : [];

  return (
    <div className="site-container page-stack">
      <section className="lb-hero">
        <p className="eyebrow">Benchmarks</p>
        <h1>Browse LoopsBench tasks</h1>
        <p>
          Explore all LoopsBench tasks, filter by domain or difficulty, and open a task page to inspect the
          module DAG against the full unit-level execution scale.
        </p>
      </section>

      {payload ? (
        <div className="summary-grid">
          {summaryCards.map((card) => (
            <article className="summary-card" key={card.label}>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.detail}</span>
            </article>
          ))}
        </div>
      ) : null}

      <section className="benchmark-browser">
        <div className="benchmark-browser-head">
          <p>
            {loading
              ? "Loading tasks..."
              : `Showing ${filteredTasks.length.toLocaleString()} of ${(payload?.tasks.length ?? 0).toLocaleString()} tasks`}
          </p>
          <button
            className="benchmark-clear-button"
            type="button"
            disabled={!hasActiveFilters}
            onClick={() => {
              setQuery("");
              setSelectedCategories([]);
              setSelectedTags([]);
              setSelectedDifficulties([]);
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="benchmark-controls">
          <label className="benchmark-search">
            <input
              type="search"
              value={query}
              placeholder="Search tasks"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="benchmark-filter-row">
            <FilterMenu
              label="Categories"
              queryLabel="categories"
              options={payload?.filters.categories ?? []}
              selected={selectedCategories}
              onToggle={(value) => setSelectedCategories((current) => toggleValue(current, value))}
              searchable
            />
            <FilterMenu
              label="Tags"
              queryLabel="tags"
              options={payload?.filters.tags ?? []}
              selected={selectedTags}
              onToggle={(value) => setSelectedTags((current) => toggleValue(current, value))}
              searchable
            />
            <FilterMenu
              label="Difficulty"
              queryLabel="difficulty"
              options={payload?.filters.difficulties ?? []}
              selected={selectedDifficulties}
              onToggle={(value) => setSelectedDifficulties((current) => toggleValue(current, value))}
            />
          </div>
        </div>

        {error ? <p className="benchmark-state">{error}</p> : null}
        {!loading && !error && filteredTasks.length === 0 ? (
          <p className="benchmark-state">No tasks match the current filters.</p>
        ) : null}

        <div className="benchmark-grid">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </section>
    </div>
  );
}
