import { useEffect, useState } from "react";
import { DagLayerBars } from "./DagLayerBars";
import { ModuleDagGraph } from "./ModuleDagGraph";
import { getBenchmarkTask } from "../../lib/benchmarksApi";
import { toAppPath } from "../../lib/site";
import type { BenchmarkTaskDetail, ModuleDagNode } from "../../types/benchmarks";

type BenchmarkTaskPageProps = {
  taskId: string;
};

type UsageOption = {
  key: "agent" | "oracle";
  label: string;
  eyebrow: string;
  description: string;
  command: string;
};

function formatDifficulty(value: string) {
  return value.replace(/_/g, " ");
}

function buildFilteredBenchmarksHref(kind: "category" | "difficulty" | "tag", value: string) {
  const params = new URLSearchParams();
  if (kind === "category") {
    params.append("category", value);
  } else if (kind === "difficulty") {
    params.append("difficulty", value);
  } else {
    params.append("tag", value);
  }
  return `${toAppPath("/benchmarks")}?${params.toString()}`;
}

function pickDefaultNode(task: BenchmarkTaskDetail) {
  return [...task.moduleDag.nodes].sort((left, right) => {
    if (left.outdegree !== right.outdegree) {
      return right.outdegree - left.outdegree;
    }
    if (left.indegree !== right.indegree) {
      return right.indegree - left.indegree;
    }
    return left.label.localeCompare(right.label);
  })[0];
}

function formatMinutes(value: number) {
  if (!value) {
    return "n/a";
  }
  if (value < 60) {
    return `${value} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatSeconds(value: number) {
  if (!value) {
    return "n/a";
  }
  return Number.isInteger(value) ? `${value}s` : `${value.toFixed(1)}s`;
}

function formatRatio(numerator: number, denominator: number) {
  if (!denominator) {
    return "0%";
  }
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function splitInstructionBlocks(instruction: string) {
  return instruction
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function buildUsageOptions(task: BenchmarkTaskDetail): UsageOption[] {
  const taskName = task.taskName || task.id;
  return [
    {
      key: "agent",
      label: "Agent run",
      eyebrow: "Run this task",
      description: "Use any LoopsBench-compatible agent against this task bundle.",
      command: `lhb run \\
  --agent your-agent \\
  --task-id ${taskName} \\
  --dataset-path tasks`,
    },
    {
      key: "oracle",
      label: "Oracle verify",
      eyebrow: "Verify correctness",
      description: "Reproduce the reference Oracle pass for this exact task definition.",
      command: `lhb run \\
  --agent oracle \\
  --task-id ${taskName} \\
  --dataset-path tasks`,
    },
  ];
}

function fallbackDescription(value: string) {
  return value.trim() || "No module description was provided for this node.";
}

export function BenchmarkTaskPage({ taskId }: BenchmarkTaskPageProps) {
  const [task, setTask] = useState<BenchmarkTaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeUsageKey, setActiveUsageKey] = useState<UsageOption["key"]>("agent");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void getBenchmarkTask(taskId)
      .then((nextTask) => {
        setTask(nextTask);
        setSelectedNodeId(pickDefaultNode(nextTask)?.id ?? null);
        setActiveUsageKey("agent");
        setError(null);
      })
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : "Failed to load task details.");
        setTask(null);
      })
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div className="site-container page-stack">
        <section className="benchmark-state-shell">
          <p className="eyebrow">Benchmarks</p>
          <h1>Loading task</h1>
          <p className="benchmark-state">Fetching benchmark metadata and DAG details.</p>
        </section>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="site-container page-stack">
        <section className="benchmark-state-shell">
          <p className="eyebrow">Benchmarks</p>
          <h1>Task not found</h1>
          <p className="benchmark-state">{error ?? "The requested task could not be loaded."}</p>
          <p>
            <a className="text-link" href={toAppPath("/benchmarks")}>
              Return to benchmarks
            </a>
          </p>
        </section>
      </div>
    );
  }

  const usageOptions = buildUsageOptions(task);
  const activeUsage = usageOptions.find((option) => option.key === activeUsageKey) ?? usageOptions[0];
  const selectedNode =
    task.moduleDag.nodes.find((node) => node.id === selectedNodeId) ?? pickDefaultNode(task) ?? null;
  const upstreamEdges = task.moduleDag.edges.filter((edge) => edge.to === selectedNode?.id);
  const downstreamEdges = task.moduleDag.edges.filter((edge) => edge.from === selectedNode?.id);
  const upstreamNodes = upstreamEdges
    .map((edge) => task.moduleDag.nodes.find((node) => node.id === edge.from))
    .filter((node): node is ModuleDagNode => Boolean(node));
  const downstreamNodes = downstreamEdges
    .map((edge) => task.moduleDag.nodes.find((node) => node.id === edge.to))
    .filter((node): node is ModuleDagNode => Boolean(node));
  const instructionBlocks = splitInstructionBlocks(task.instruction);
  const testedRatio = formatRatio(task.unitDag.testedUnits, task.unitDag.totalUnits);

  const graphStats = [
    {
      label: "Module DAG",
      value: `${task.moduleDag.nodeCount.toLocaleString()} modules`,
      detail: `${task.moduleDag.layerCount.toLocaleString()} layers`,
    },
    {
      label: "Unit DAG",
      value: `${task.unitDag.totalUnits.toLocaleString()} units`,
      detail: `${task.unitDag.layerCount.toLocaleString()} layers`,
    },
    {
      label: "Direct tests",
      value: `${task.unitDag.testedUnits.toLocaleString()} units`,
      detail: `${testedRatio} of the unit DAG`,
    },
    {
      label: "Implementation order",
      value: `${task.moduleDag.edgeCount.toLocaleString()} edges`,
      detail: `${task.moduleDag.moduleFilesTotal.toLocaleString()} files represented`,
    },
  ];

  const quickFacts = [
    { label: "Benchmark", value: "LoopsBench" },
    { label: "Task ID", value: task.taskName },
    { label: "Task path", value: task.taskPath },
    { label: "Category", value: task.category },
    { label: "Difficulty", value: formatDifficulty(task.difficulty) },
  ];

  const structureFacts = [
    { label: "Modules", value: task.moduleDag.nodeCount.toLocaleString() },
    { label: "Module layers", value: task.moduleDag.layerCount.toLocaleString() },
    { label: "Units", value: task.unitDag.totalUnits.toLocaleString() },
    { label: "Test-coupled", value: `${task.unitDag.testedUnits.toLocaleString()} (${testedRatio})` },
    { label: "Expert time", value: formatMinutes(task.expertTimeEstimateMin) },
    { label: "Junior time", value: formatMinutes(task.juniorTimeEstimateMin) },
  ];

  const executionFacts = [
    { label: "Parser", value: task.parserName },
    { label: "Agent timeout", value: formatSeconds(task.maxAgentTimeoutSec) },
    { label: "Test timeout", value: formatSeconds(task.maxTestTimeoutSec) },
    { label: "Same shell", value: task.runTestsInSameShell ? "Yes" : "No" },
  ];

  function handleCopy(key: string, value: string) {
    if (!navigator.clipboard?.writeText) {
      return;
    }
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1600);
    }).catch(() => undefined);
  }

  return (
    <div className="site-container page-stack benchmark-task-page">
      <nav className="benchmark-breadcrumbs" aria-label="Breadcrumb">
        <a href={toAppPath("/")}>Home</a>
        <span>/</span>
        <a href={toAppPath("/benchmarks")}>Benchmarks</a>
        <span>/</span>
        <span>LoopsBench</span>
        <span>/</span>
        <span>{task.taskName}</span>
      </nav>

      <div className="benchmark-detail-grid">
        <main className="benchmark-detail-main">
          <section className="benchmark-task-hero benchmark-task-hero-aligned">
            <p className="eyebrow">Benchmark Task</p>
            <p className="benchmark-task-kicker">{task.taskName}</p>
            <h1>{task.title}</h1>
            <p className="benchmark-task-summary">{task.summary}</p>

            <div className="benchmark-task-inline-meta">
              <span className="benchmark-badge benchmark-badge-strong">loopsbench</span>
              <a className="benchmark-badge" href={buildFilteredBenchmarksHref("category", task.category)}>
                {task.category}
              </a>
              <a className="benchmark-badge" href={buildFilteredBenchmarksHref("difficulty", task.difficulty)}>
                {formatDifficulty(task.difficulty)}
              </a>
            </div>
          </section>

          <section className="benchmark-panel benchmark-usage-panel">
            <div className="section-heading">
              <h2>Usage</h2>
              <p>Run this task directly from the LoopsBench harness.</p>
            </div>

            <div className="benchmark-command-shell">
              <div className="benchmark-command-tabs" role="tablist" aria-label="Task usage options">
                {usageOptions.map((option) => (
                  <button
                    aria-selected={activeUsage.key === option.key}
                    className={`benchmark-command-tab${activeUsage.key === option.key ? " benchmark-command-tab-active" : ""}`}
                    key={option.key}
                    role="tab"
                    type="button"
                    onClick={() => setActiveUsageKey(option.key)}
                  >
                    <span>{option.label}</span>
                    <small>{option.eyebrow}</small>
                  </button>
                ))}
              </div>

              <div className="benchmark-command-card">
                <div className="benchmark-command-card-head">
                  <div>
                    <p className="benchmark-command-eyebrow">{activeUsage.eyebrow}</p>
                    <p className="benchmark-command-copy">{activeUsage.description}</p>
                  </div>
                  <button
                    className="benchmark-copy-button"
                    type="button"
                    onClick={() => handleCopy(`usage-${activeUsage.key}`, activeUsage.command)}
                  >
                    {copiedKey === `usage-${activeUsage.key}` ? "Copied" : "Copy command"}
                  </button>
                </div>
                <pre className="benchmark-command-block">{activeUsage.command}</pre>
              </div>

              <p className="benchmark-panel-note">
                New to LoopsBench? See the{" "}
                <a className="text-link" href={toAppPath("/run-loopsbench")}>
                  run guide
                </a>{" "}
                for setup and execution details.
              </p>
            </div>
          </section>

          <section className="benchmark-panel benchmark-instruction-panel">
            <div className="section-heading">
              <h2>Instruction</h2>
              <p>The exact task prompt shipped with this benchmark bundle.</p>
            </div>
            <div className="benchmark-instruction-prose">
              {instructionBlocks.map((block, index) => (
                <p key={`${task.id}-instruction-${index}`}>{block}</p>
              ))}
            </div>
          </section>

          <section className="benchmark-panel benchmark-dag-panel">
            <div className="section-heading">
              <h2>Task Graph</h2>
              <p>
                {task.moduleDag.moduleFilesTotal.toLocaleString()} files ·{" "}
                {task.moduleDag.moduleLocTotal.toLocaleString()} LOC represented
              </p>
            </div>

            <div className="benchmark-detail-stat-grid">
              {graphStats.map((card) => (
                <article className="benchmark-detail-stat" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.detail}</small>
                </article>
              ))}
            </div>

            <p className="benchmark-panel-copy">
              LoopsBench keeps the registry-style task page readable while still exposing the full dependency shape:
              the graph below is the human-readable module DAG, and the companion chart tracks true unit-level depth.
            </p>

            <ModuleDagGraph dag={task.moduleDag} selectedNodeId={selectedNode?.id ?? null} onSelect={setSelectedNodeId} />

            <div className="benchmark-dag-subgrid">
              <article className="benchmark-side-card benchmark-selected-card">
                <div className="benchmark-card-section-head">
                  <div>
                    <p className="benchmark-side-eyebrow">Selected module</p>
                    <h3>{selectedNode?.label ?? "No module selected"}</h3>
                  </div>
                  {selectedNode ? (
                    <button
                      className="benchmark-copy-button"
                      type="button"
                      onClick={() => handleCopy("module-path", selectedNode.path)}
                    >
                      {copiedKey === "module-path" ? "Copied" : "Copy path"}
                    </button>
                  ) : null}
                </div>

                {selectedNode ? (
                  <>
                    <p className="benchmark-module-path">{selectedNode.path}</p>
                    <div className="benchmark-module-stats">
                      <span>{selectedNode.filesCount.toLocaleString()} files</span>
                      <span>{selectedNode.loc.toLocaleString()} LOC</span>
                      <span>Layer {selectedNode.layer}</span>
                    </div>
                    <p className="benchmark-panel-copy">{fallbackDescription(selectedNode.description)}</p>

                    <div className="benchmark-module-relations">
                      <div>
                        <h4>Depends on</h4>
                        {upstreamNodes.length > 0 ? (
                          <ul>
                            {upstreamNodes.map((node) => (
                              <li key={node.id}>{node.label}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Entry module.</p>
                        )}
                      </div>
                      <div>
                        <h4>Unlocks</h4>
                        {downstreamNodes.length > 0 ? (
                          <ul>
                            {downstreamNodes.map((node) => (
                              <li key={node.id}>{node.label}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>Terminal module.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </article>

              <article className="benchmark-side-card benchmark-layer-card">
                <div className="benchmark-card-section-head">
                  <div>
                    <p className="benchmark-side-eyebrow">Execution scale</p>
                    <h3>Unit-layer depth</h3>
                  </div>
                </div>
                <p className="benchmark-panel-copy">
                  Each bar is one unit-DAG layer. The full column is total units; the brighter overlay is the subset with
                  direct tests.
                </p>
                <DagLayerBars layers={task.unitDag.layers} />
              </article>
            </div>
          </section>

          <section className="benchmark-panel">
            <div className="section-heading">
              <h2>Module Breakdown</h2>
              <p>Click any card to focus it in the dependency view above.</p>
            </div>
            <div className="benchmark-module-grid">
              {task.moduleDag.nodes
                .slice()
                .sort((left, right) => {
                  if (left.layer !== right.layer) {
                    return left.layer - right.layer;
                  }
                  if (left.implOrder !== right.implOrder) {
                    return left.implOrder - right.implOrder;
                  }
                  return left.label.localeCompare(right.label);
                })
                .map((node) => (
                  <button
                    className={`benchmark-module-card${node.id === selectedNode?.id ? " benchmark-module-card-active" : ""}`}
                    type="button"
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <div className="benchmark-module-card-head">
                      <strong>{node.label}</strong>
                      <span>Layer {node.layer}</span>
                    </div>
                    <p>{fallbackDescription(node.description)}</p>
                    <div className="benchmark-module-card-meta">
                      <span>{node.path}</span>
                      <span>
                        {node.filesCount.toLocaleString()} files · {node.loc.toLocaleString()} LOC
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </section>

          <section className="benchmark-panel benchmark-metadata-panel">
            <div className="section-heading">
              <h2>Task metadata</h2>
              <p>Tags, authorship, and execution settings.</p>
            </div>

            <div className="benchmark-metadata-grid">
              <article className="benchmark-meta-section">
                <h3>Tags</h3>
                <div className="benchmark-badges">
                  {task.tags.map((tag) => (
                    <a className="benchmark-badge" href={buildFilteredBenchmarksHref("tag", tag)} key={tag}>
                      {tag}
                    </a>
                  ))}
                </div>
              </article>

              <article className="benchmark-meta-section">
                <h3>Created by</h3>
                <p>{task.authorName}</p>
                {task.authorEmail ? <span className="benchmark-meta-note">{task.authorEmail}</span> : null}
              </article>

              <article className="benchmark-meta-section">
                <h3>Execution envelope</h3>
                <div className="benchmark-meta-list">
                  {executionFacts.map((item) => (
                    <div className="benchmark-meta-row" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </main>

        <aside className="benchmark-detail-sidebar">
          <article className="benchmark-side-card">
            <p className="benchmark-side-eyebrow">Task at a glance</p>
            <div className="benchmark-side-title-row">
              <strong>{task.taskName}</strong>
              <button className="benchmark-copy-button" type="button" onClick={() => handleCopy("task-id", task.taskName)}>
                {copiedKey === "task-id" ? "Copied" : "Copy ID"}
              </button>
            </div>

            <div className="benchmark-side-list">
              {quickFacts.map((item) => (
                <div className="benchmark-side-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="benchmark-side-actions">
              <a className="benchmark-side-link" href={task.repoUrl} target="_blank" rel="noreferrer">
                View task folder
              </a>
              <a className="benchmark-side-link benchmark-side-link-secondary" href={toAppPath("/benchmarks")}>
                Browse all tasks
              </a>
            </div>
          </article>

          <article className="benchmark-side-card">
            <p className="benchmark-side-eyebrow">Structure</p>
            <div className="benchmark-side-list">
              {structureFacts.map((item) => (
                <div className="benchmark-side-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}
