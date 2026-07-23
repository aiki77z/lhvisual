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
  command: string;
};

function formatDifficulty(value: string) {
  return value.replace(/_/g, " ");
}

function buildBenchmarksHref(difficulty?: string) {
  if (!difficulty) {
    return toAppPath("/benchmarks");
  }

  const params = new URLSearchParams();
  params.set("difficulty", difficulty);
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
      command: `lhb run \\
  --agent your-agent \\
  --task-id ${taskName} \\
  --dataset-path tasks`,
    },
    {
      key: "oracle",
      label: "Oracle verify",
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
      <div className="benchmark-detail-page">
        <div className="benchmark-detail-inner">
          <section className="registry-state-block">
            <h1 className="registry-page-title">Loading task</h1>
            <p className="registry-empty-state">Fetching benchmark metadata and task details.</p>
          </section>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="benchmark-detail-page">
        <div className="benchmark-detail-inner">
          <section className="registry-state-block">
            <h1 className="registry-page-title">Task not found</h1>
            <p className="registry-empty-state">{error ?? "The requested task could not be loaded."}</p>
            <p className="registry-detail-note">
              <a className="text-link" href={toAppPath("/benchmarks")}>
                Return to benchmarks
              </a>
            </p>
          </section>
        </div>
      </div>
    );
  }

  const usageOptions = buildUsageOptions(task);
  const activeUsage = usageOptions.find((option) => option.key === activeUsageKey) ?? usageOptions[0];
  const instructionBlocks = splitInstructionBlocks(task.instruction);
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

  const structureFacts = [
    { label: "Modules", value: task.moduleDag.nodeCount.toLocaleString() },
    { label: "Module layers", value: task.moduleDag.layerCount.toLocaleString() },
    { label: "Units", value: task.unitDag.totalUnits.toLocaleString() },
    { label: "Test-coupled units", value: task.unitDag.testedUnits.toLocaleString() },
    { label: "Expert time", value: formatMinutes(task.expertTimeEstimateMin) },
    { label: "Junior time", value: formatMinutes(task.juniorTimeEstimateMin) },
  ];

  const executionFacts = [
    { label: "Parser", value: task.parserName },
    { label: "Agent timeout", value: formatSeconds(task.maxAgentTimeoutSec) },
    { label: "Test timeout", value: formatSeconds(task.maxTestTimeoutSec) },
    { label: "Same shell tests", value: task.runTestsInSameShell ? "Yes" : "No" },
    { label: "Files represented", value: task.moduleDag.moduleFilesTotal.toLocaleString() },
    { label: "LOC represented", value: task.moduleDag.moduleLocTotal.toLocaleString() },
  ];

  return (
    <div className="benchmark-detail-page">
      <div className="benchmark-detail-inner">
        <nav className="registry-breadcrumbs" aria-label="Breadcrumb">
          <a href={toAppPath("/")}>Home</a>
          <span>&gt;</span>
          <a href={toAppPath("/benchmarks")}>Benchmarks</a>
          <span>&gt;</span>
          <span>{task.taskName}</span>
        </nav>

        <header className="registry-detail-hero">
          <p className="registry-detail-task-id">{task.taskName}</p>
          <h1 className="registry-detail-title">{task.title}</h1>
          <p className="registry-detail-summary">{task.summary}</p>
          <p className="registry-detail-benchmark-line">LoopsBench / dependency-native coding task</p>

          <div className="registry-detail-meta">
            <a className="registry-card-link" href={task.repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span className="registry-badge">{task.category}</span>
            <a className="registry-badge" href={buildBenchmarksHref(task.difficulty)}>
              {formatDifficulty(task.difficulty)}
            </a>
          </div>
        </header>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Usage</h2>

          <div className="registry-usage-tabs" role="tablist" aria-label="Usage examples">
            {usageOptions.map((option) => (
              <button
                key={option.key}
                aria-selected={activeUsage.key === option.key}
                className={`registry-usage-tab${activeUsage.key === option.key ? " registry-usage-tab-active" : ""}`}
                role="tab"
                type="button"
                onClick={() => setActiveUsageKey(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <pre className="registry-command-block">{activeUsage.command}</pre>
          <p className="registry-detail-note">
            New to LoopsBench? See our{" "}
            <a className="text-link" href={toAppPath("/run-loopsbench")}>
              run guide
            </a>
            .
          </p>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Instruction</h2>
          <div className="registry-detail-prose">
            {instructionBlocks.map((block, index) => (
              <p key={`${task.id}-instruction-${index}`}>{block}</p>
            ))}
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Structure</h2>

          <div className="registry-fact-grid">
            {structureFacts.map((item) => (
              <div className="registry-fact" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="registry-fact-grid registry-fact-grid-secondary">
            {executionFacts.map((item) => (
              <div className="registry-fact" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Task graph</h2>
          <p className="registry-detail-note">
            LoopsBench tasks include a readable module DAG for structure and a unit DAG for execution depth. The graph
            below keeps the high-level implementation order visible while preserving the full dependency shape.
          </p>
          <div className="registry-graph-frame">
            <ModuleDagGraph dag={task.moduleDag} selectedNodeId={selectedNode?.id ?? null} onSelect={setSelectedNodeId} />
          </div>
        </section>

        <section className="registry-detail-section">
          <div className="registry-detail-subgrid">
            <article className="registry-info-box">
              <h3 className="registry-subsection-title">Selected module</h3>
              {selectedNode ? (
                <>
                  <p className="registry-module-path">{selectedNode.path}</p>
                  <p className="registry-detail-note">{fallbackDescription(selectedNode.description)}</p>
                  <div className="registry-inline-stats">
                    <span>{selectedNode.filesCount.toLocaleString()} files</span>
                    <span>{selectedNode.loc.toLocaleString()} LOC</span>
                    <span>Layer {selectedNode.layer}</span>
                  </div>

                  <div className="registry-relations-grid">
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

            <article className="registry-info-box">
              <h3 className="registry-subsection-title">Unit-layer depth</h3>
              <p className="registry-detail-note">
                Each bar represents one unit-DAG layer. The full column is total units in that layer; the brighter
                overlay marks the subset with direct tests.
              </p>
              <DagLayerBars layers={task.unitDag.layers} />
            </article>
          </div>
        </section>

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Module breakdown</h2>
          <div className="registry-module-grid">
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
                  key={node.id}
                  className={`registry-module-card${node.id === selectedNode?.id ? " registry-module-card-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div className="registry-module-card-head">
                    <strong>{node.label}</strong>
                    <span>Layer {node.layer}</span>
                  </div>
                  <p>{fallbackDescription(node.description)}</p>
                  <small>
                    {node.path} · {node.filesCount.toLocaleString()} files · {node.loc.toLocaleString()} LOC
                  </small>
                </button>
              ))}
          </div>
        </section>

        {task.tags.length > 0 ? (
          <section className="registry-detail-section">
            <h2 className="registry-detail-heading">Tags</h2>
            <div className="registry-tag-list">
              {task.tags.map((tag) => (
                <span className="registry-badge" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="registry-detail-section">
          <h2 className="registry-detail-heading">Created by</h2>
          <p className="registry-detail-note">{task.authorName}</p>
          {task.authorEmail ? <p className="registry-detail-note">{task.authorEmail}</p> : null}
        </section>
      </div>
    </div>
  );
}
