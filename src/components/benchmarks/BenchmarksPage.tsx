import { useDeferredValue, useEffect, useState } from "react";
import { getBenchmarksIndex } from "../../lib/benchmarksApi";
import { toPlainDisplayText } from "../../lib/plainText";
import { toAppPath } from "../../lib/site";
import type { BenchmarkTaskSummary, BenchmarksIndexPayload } from "../../types/benchmarks";

type FilterState = {
  query: string;
  difficulty: string;
};

function readFiltersFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("q") ?? "",
    difficulty: params.get("difficulty") ?? "",
  };
}

function writeFiltersToUrl(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.difficulty) {
    params.set("difficulty", filters.difficulty);
  }

  const path = toAppPath("/benchmarks");
  const nextUrl = params.toString() ? `${path}?${params.toString()}` : path;
  window.history.replaceState(null, "", nextUrl);
}

function formatDifficulty(value: string) {
  return value.replace(/_/g, " ");
}

function BenchmarkStats({ payload, filteredCount }: { payload: BenchmarksIndexPayload; filteredCount: number }) {
  const stats = [
    { label: "visible", value: filteredCount.toLocaleString() },
    { label: "tasks", value: payload.benchmark.taskCount.toLocaleString() },
    { label: "units", value: payload.benchmark.totalUnits.toLocaleString() },
    { label: "tested", value: payload.benchmark.totalTestedUnits.toLocaleString() },
  ];

  return (
    <section className="registry-terminal-summary" aria-label="Benchmark summary">
      <header>
        <span>loopsbench/tasks</span>
        <code>static snapshot</code>
      </header>
      <div className="registry-terminal-lines">
        <p>
          <span>$</span> lhb tasks list --dataset LoopsBench
        </p>
        <p>
          <span>ok</span> {payload.benchmark.description}
        </p>
      </div>
      <div className="registry-terminal-stats">
        {stats.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TaskCard({ task }: { task: BenchmarkTaskSummary }) {
  const taskHref = toAppPath(`/benchmarks/${encodeURIComponent(task.id)}`);
  const preview = toPlainDisplayText(task.instructionPreview || task.summary);
  const tags = task.tags.slice(0, 4).join(", ");
  const openTask = () => {
    window.location.assign(taskHref);
  };

  return (
    <article
      className="registry-card registry-card-clickable"
      role="link"
      tabIndex={0}
      aria-label={`Open ${task.title}`}
      onClick={openTask}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTask();
        }
      }}
    >
      <div className="registry-card-head">
        <div className="registry-card-titleblock">
          <h2 className="registry-card-title">{task.title}</h2>
        </div>
        <a
          className="registry-card-link"
          href={task.repoUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          GitHub
        </a>
      </div>

      <div className="registry-card-meta">
        <span className="registry-badge">{task.category}</span>
        <span className="registry-badge">{formatDifficulty(task.difficulty)}</span>
      </div>

      <p className="registry-card-preview">{preview}</p>

      {tags ? <p className="registry-card-tags">{tags}</p> : null}

      <div className="registry-card-foot">
        <small>
          {task.moduleNodeCount.toLocaleString()} modules · {task.unitCount.toLocaleString()} units
        </small>
      </div>
    </article>
  );
}

export function BenchmarksPage() {
  const initialFilters = readFiltersFromUrl();
  const [payload, setPayload] = useState<BenchmarksIndexPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialFilters.query);
  const [difficulty, setDifficulty] = useState(initialFilters.difficulty);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    void getBenchmarksIndex()
      .then((nextPayload) => {
        setPayload(nextPayload);
        setError(null);
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : "Failed to load benchmarks.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    writeFiltersToUrl({ query, difficulty });
  }, [query, difficulty]);

  const filteredTasks = (payload?.tasks ?? [])
    .filter((task) => {
      const searchNeedle = deferredQuery.trim().toLowerCase();
      if (searchNeedle) {
        const haystack = [
          task.id,
          task.taskName,
          task.title,
          task.summary,
          task.instructionPreview,
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

      if (difficulty && task.difficulty !== difficulty) {
        return false;
      }

      return true;
    })
    .sort((left, right) => left.title.localeCompare(right.title) || left.taskName.localeCompare(right.taskName));

  const totalCount = payload?.tasks.length ?? 0;
  const filteredCount = filteredTasks.length;
  const hasActiveFilters = Boolean(query.trim()) || Boolean(difficulty);
  const countLabel = loading
    ? "Loading tasks..."
    : hasActiveFilters
      ? `Showing ${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()} tasks`
      : `Showing ${totalCount.toLocaleString()} tasks`;

  return (
    <div className="benchmarks-index-page">
      <div className="benchmarks-index-inner">
        <nav className="registry-breadcrumbs" aria-label="Breadcrumb">
          <a href={toAppPath("/")}>Home</a>
          <span>&gt;</span>
          <span>Benchmarks</span>
        </nav>

        <header className="registry-page-header">
          <div>
            <h1 className="registry-page-title">Benchmarks</h1>
            <p className="registry-page-subtitle">{countLabel}</p>
          </div>
          <button
            className="registry-clear-button"
            type="button"
            disabled={!hasActiveFilters}
            onClick={() => {
              setQuery("");
              setDifficulty("");
            }}
          >
            Clear filters
          </button>
        </header>

        {payload ? <BenchmarkStats payload={payload} filteredCount={filteredCount} /> : null}

        <section className="registry-filterbar" aria-label="Benchmark filters">
          <label className="registry-search-field">
            <input
              type="search"
              value={query}
              placeholder="Search tasks"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="registry-select-shell">
            <select
              className={difficulty ? "registry-select-filled" : ""}
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="">Select difficulty</option>
              {(payload?.filters.difficulties ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {formatDifficulty(option.value)}
                </option>
              ))}
            </select>
          </label>
        </section>

        {error ? <p className="registry-empty-state">{error}</p> : null}
        {!loading && !error && filteredTasks.length === 0 ? (
          <p className="registry-empty-state">No tasks match the current filters.</p>
        ) : null}

        <section className="registry-grid" aria-label="LoopsBench tasks">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </section>
      </div>
    </div>
  );
}
