import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { getBenchmarksIndex } from "../../lib/benchmarksApi";
import { toPlainDisplayText } from "../../lib/plainText";
import { toAppPath } from "../../lib/site";
import type { BenchmarkFilterOption, BenchmarkTaskSummary, BenchmarksIndexPayload } from "../../types/benchmarks";

type FilterState = {
  query: string;
  difficulty: string;
  category: string;
  tag: string;
  shouldDefaultDifficulty: boolean;
};

type PersistedFilters = Pick<FilterState, "query" | "difficulty" | "category" | "tag">;
type FilterMenuKey = "difficulty" | "category" | "tag";

function readFiltersFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("q") ?? "",
    difficulty: params.get("difficulty") ?? "",
    category: params.get("category") ?? "",
    tag: params.get("tag") ?? "",
    shouldDefaultDifficulty: !params.has("difficulty"),
  };
}

function writeFiltersToUrl(filters: PersistedFilters) {
  const params = new URLSearchParams();
  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }
  if (filters.difficulty) {
    params.set("difficulty", filters.difficulty);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.tag) {
    params.set("tag", filters.tag);
  }

  const path = toAppPath("/benchmarks");
  const nextUrl = params.toString() ? `${path}?${params.toString()}` : path;
  window.history.replaceState(null, "", nextUrl);
}

function formatDifficulty(value: string) {
  return value.replace(/_/g, " ");
}

function formatFacet(value: string) {
  return value.replace(/_/g, " ").replace(/-/g, " ");
}

function FilterDropdown({
  label,
  placeholder,
  value,
  options,
  isOpen,
  onOpenChange,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: BenchmarkFilterOption[];
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onChange: (nextValue: string) => void;
}) {
  const triggerId = useId();
  const menuId = `${triggerId}-menu`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const menuOptions = [{ value: "", label: placeholder }, ...options.map((option) => ({ value: option.value, label: formatFacet(option.value) }))];
  const displayValue = value ? formatFacet(value) : placeholder;
  const selectedIndex = Math.max(
    0,
    menuOptions.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(selectedIndex);
  }, [isOpen, selectedIndex]);

  const focusOption = (index: number) => {
    if (menuOptions.length === 0) {
      return;
    }

    const normalizedIndex = (index + menuOptions.length) % menuOptions.length;
    setActiveIndex(normalizedIndex);
    window.requestAnimationFrame(() => {
      optionRefs.current[normalizedIndex]?.focus();
    });
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    onOpenChange(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="registry-filter-item registry-combobox">
      <button
        ref={triggerRef}
        id={triggerId}
        className={`registry-combobox-trigger${value ? " registry-combobox-filled" : ""}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`${label}: ${displayValue}`}
        onClick={() => {
          if (isOpen) {
            onOpenChange(false);
            return;
          }

          onOpenChange(true);
          focusOption(selectedIndex);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (isOpen) {
              onOpenChange(false);
              return;
            }

            onOpenChange(true);
            focusOption(selectedIndex);
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            onOpenChange(true);
            focusOption(selectedIndex);
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            onOpenChange(true);
            focusOption(selectedIndex === 0 ? menuOptions.length - 1 : selectedIndex);
          }

          if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            onOpenChange(false);
          }
        }}
      >
        <span>{displayValue}</span>
        <span className="registry-combobox-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="registry-combobox-panel">
          <div className="registry-combobox-options" id={menuId} role="listbox" aria-labelledby={triggerId}>
            {menuOptions.map((option, index) => (
              <div
                key={option.value}
                id={`${menuId}-option-${index}`}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                className={`registry-combobox-option${value === option.value || (!value && option.value === "") ? " is-selected" : ""}`}
                role="option"
                aria-selected={value === option.value || (!value && option.value === "")}
                tabIndex={activeIndex === index ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect(option.value);
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusOption(index + 1);
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusOption(index - 1);
                  }

                  if (event.key === "Home") {
                    event.preventDefault();
                    focusOption(0);
                  }

                  if (event.key === "End") {
                    event.preventDefault();
                    focusOption(menuOptions.length - 1);
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    onOpenChange(false);
                    triggerRef.current?.focus();
                  }

                  if (event.key === "Tab") {
                    onOpenChange(false);
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
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
          <span>$</span> loopsbench tasks list --tasks-dir tasks
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
        <small>{task.unitCount.toLocaleString()} units</small>
      </div>
    </article>
  );
}

export function BenchmarksPage() {
  const initialFilters = readFiltersFromUrl();
  const filterBarRef = useRef<HTMLElement | null>(null);
  const [payload, setPayload] = useState<BenchmarksIndexPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialFilters.query);
  const [difficulty, setDifficulty] = useState(initialFilters.difficulty);
  const [category, setCategory] = useState(initialFilters.category);
  const [tag, setTag] = useState(initialFilters.tag);
  const [openMenu, setOpenMenu] = useState<FilterMenuKey | null>(null);
  const [shouldDefaultDifficulty, setShouldDefaultDifficulty] = useState(initialFilters.shouldDefaultDifficulty);
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
    writeFiltersToUrl({ query, difficulty, category, tag });
  }, [query, difficulty, category, tag]);

  useEffect(() => {
    if (!payload || !shouldDefaultDifficulty) {
      return;
    }

    if (payload.filters.difficulties.some((option) => option.value === "easy")) {
      setDifficulty("easy");
    }
    setShouldDefaultDifficulty(false);
  }, [payload, shouldDefaultDifficulty]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (!filterBarRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

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

      if (category && task.category !== category) {
        return false;
      }

      if (tag && !task.tags.includes(tag)) {
        return false;
      }

      return true;
    })
    .sort((left, right) => left.title.localeCompare(right.title) || left.taskName.localeCompare(right.taskName));

  const totalCount = payload?.tasks.length ?? 0;
  const filteredCount = filteredTasks.length;
  const hasActiveFilters = Boolean(query.trim()) || Boolean(difficulty) || Boolean(category) || Boolean(tag);
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
              setCategory("");
              setTag("");
            }}
          >
            Clear filters
          </button>
        </header>

        {payload ? <BenchmarkStats payload={payload} filteredCount={filteredCount} /> : null}

        <section className="registry-filterbar" aria-label="Benchmark filters" ref={filterBarRef}>
          <label className="registry-filter-item registry-search-field">
            <input
              type="search"
              value={query}
              placeholder="Search tasks"
              onFocus={() => setOpenMenu(null)}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <FilterDropdown
            label="Select difficulty"
            placeholder="Select difficulty"
            value={difficulty}
            options={payload?.filters.difficulties ?? []}
            isOpen={openMenu === "difficulty"}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "difficulty" : null)}
            onChange={setDifficulty}
          />

          <FilterDropdown
            label="Select category"
            placeholder="Select category"
            value={category}
            options={payload?.filters.categories ?? []}
            isOpen={openMenu === "category"}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "category" : null)}
            onChange={setCategory}
          />

          <FilterDropdown
            label="Select tag"
            placeholder="Select tag"
            value={tag}
            options={payload?.filters.tags ?? []}
            isOpen={openMenu === "tag"}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "tag" : null)}
            onChange={setTag}
          />
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
