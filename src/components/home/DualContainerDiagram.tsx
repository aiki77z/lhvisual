import { useState } from "react";

type Stage = "edit" | "snapshot" | "verify";

const stageCopy: Record<Stage, { label: string; detail: string }> = {
  edit: {
    label: "Agent workspace",
    detail: "Container A is the sole write target; the coding loop keeps working while the runtime observes change.",
  },
  snapshot: {
    label: "Monotonic snapshot queue",
    detail: "Qualifying diffs are frozen at real change points and sent to the isolated tester.",
  },
  verify: {
    label: "Evaluator-side verification",
    detail: "Released tests and prior obligations run in Container B; checkpoint state stays with the evaluator.",
  },
};

const backgroundTerms = [
  { text: "$ git diff --cached", className: "term-a" },
  { text: "requirements/parser.yaml", className: "term-b" },
  { text: "+ def parse(source):", className: "term-c" },
  { text: "$ pytest -q tests/test_parser.py", className: "term-d" },
  { text: "snapshot_042  +128  -14", className: "term-e" },
  { text: "newly_passed: [parser, lexer]", className: "term-f" },
  { text: "ready_frontier → symbols", className: "term-g" },
  { text: "observation_history.jsonl", className: "term-h" },
];

function DockerMark() {
  return (
    <svg className="docker-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.185.185 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.186.186 0 0 0-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 0 0-.75.748 11.376 11.376 0 0 0 .692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 0 0 3.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
    </svg>
  );
}

function LockMark() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="8" width="12" height="9" rx="2" />
      <path d="M7 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function DualContainerDiagram() {
  const [activeStage, setActiveStage] = useState<Stage>("edit");
  const active = stageCopy[activeStage];

  return (
    <div className={`dual-container-diagram stage-${activeStage}`}>
      <div className="diagram-code-field" aria-hidden="true">
        {backgroundTerms.map((term) => (
          <span className={term.className} key={term.text}>{term.text}</span>
        ))}
      </div>

      <div className="docker-loop-scene">
        <svg className="loop-routes loop-routes-desktop" viewBox="0 0 1000 460" aria-hidden="true">
          <defs>
            <linearGradient id="route-forward" x1="0" x2="1">
              <stop offset="0" stopColor="#3b75d6" stopOpacity=".35" />
              <stop offset=".55" stopColor="#73b7ff" />
              <stop offset="1" stopColor="#4d8dff" stopOpacity=".7" />
            </linearGradient>
            <linearGradient id="route-cycle" x1="1" x2="0">
              <stop offset="0" stopColor="#66d0d2" stopOpacity=".55" />
              <stop offset=".55" stopColor="#668fcf" stopOpacity=".7" />
              <stop offset="1" stopColor="#4d8dff" stopOpacity=".3" />
            </linearGradient>
            <marker id="arrow-forward" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 10 5 0 10Z" fill="#72b5ff" />
            </marker>
            <marker id="arrow-cycle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 10 5 0 10Z" fill="#67b6c9" />
            </marker>
          </defs>
          <path className="loop-route route-forward" d="M260 220 C330 42 670 42 740 220" markerEnd="url(#arrow-forward)" />
          <path className="loop-route route-cycle" d="M740 238 C662 420 338 420 260 238" markerEnd="url(#arrow-cycle)" />
          <circle className="route-packet packet-forward" r="5">
            <animateMotion dur="3.4s" path="M260 220 C330 42 670 42 740 220" repeatCount="indefinite" />
          </circle>
          <circle className="route-packet packet-cycle" r="4.5">
            <animateMotion dur="4.2s" path="M740 238 C662 420 338 420 260 238" repeatCount="indefinite" />
          </circle>
        </svg>

        <svg className="loop-routes loop-routes-mobile" viewBox="0 0 360 700" aria-hidden="true">
          <defs>
            <linearGradient id="route-forward-mobile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b75d6" stopOpacity=".35" />
              <stop offset=".55" stopColor="#73b7ff" />
              <stop offset="1" stopColor="#4d8dff" stopOpacity=".7" />
            </linearGradient>
            <linearGradient id="route-cycle-mobile" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#66d0d2" stopOpacity=".55" />
              <stop offset=".55" stopColor="#668fcf" stopOpacity=".7" />
              <stop offset="1" stopColor="#4d8dff" stopOpacity=".3" />
            </linearGradient>
            <marker id="arrow-forward-mobile" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 10 5 0 10Z" fill="#72b5ff" />
            </marker>
            <marker id="arrow-cycle-mobile" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0 10 5 0 10Z" fill="#67b6c9" />
            </marker>
          </defs>
          <path className="loop-route route-forward" d="M218 150 C334 218 334 482 218 550" markerEnd="url(#arrow-forward-mobile)" />
          <path className="loop-route route-cycle" d="M142 550 C26 482 26 218 142 150" markerEnd="url(#arrow-cycle-mobile)" />
          <circle className="route-packet packet-forward" r="5">
            <animateMotion dur="3.4s" path="M218 150 C334 218 334 482 218 550" repeatCount="indefinite" />
          </circle>
          <circle className="route-packet packet-cycle" r="4.5">
            <animateMotion dur="4.2s" path="M142 550 C26 482 26 218 142 150" repeatCount="indefinite" />
          </circle>
        </svg>

        <span className="route-label route-label-forward">
          <span className="route-copy-desktop">monotonic snapshot · diff +128 −14</span>
          <span className="route-copy-mobile">snapshot · +128 −14</span>
        </span>
        <span className="route-label route-label-cycle">
          <span className="route-copy-desktop">runtime clock · no result returned</span>
          <span className="route-copy-mobile">runtime clock · no feedback</span>
        </span>

        <button
          className="docker-station docker-station-agent"
          type="button"
          aria-pressed={activeStage === "edit"}
          onClick={() => setActiveStage("edit")}
          onMouseEnter={() => setActiveStage("edit")}
          onFocus={() => setActiveStage("edit")}
        >
          <span className="docker-halo" aria-hidden="true" />
          <DockerMark />
          <small>Container A · sole write target</small>
          <strong>Agent workspace</strong>
          <span className="station-code" aria-hidden="true">
            <code><i>+</i> src/parser.py</code>
            <code><i>+</i> tests/test_parser.py</code>
            <code className="station-live">● loop keeps editing</code>
          </span>
        </button>

        <button
          className="snapshot-node"
          type="button"
          aria-label="Inspect monotonic snapshot queue"
          aria-pressed={activeStage === "snapshot"}
          onClick={() => setActiveStage("snapshot")}
          onMouseEnter={() => setActiveStage("snapshot")}
          onFocus={() => setActiveStage("snapshot")}
        >
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <span>snapshot_042</span>
          <code>queued</code>
        </button>

        <button
          className="docker-station docker-station-tester"
          type="button"
          aria-pressed={activeStage === "verify"}
          onClick={() => setActiveStage("verify")}
          onMouseEnter={() => setActiveStage("verify")}
          onFocus={() => setActiveStage("verify")}
        >
          <span className="docker-halo" aria-hidden="true" />
          <DockerMark />
          <small>Container B · isolated execution</small>
          <strong>Test evaluator</strong>
          <span className="station-tests" aria-hidden="true">
            <code><i className="pass" /> parser</code>
            <code><i className="pass" /> lexer</code>
            <code><i className="active" /> symbols</code>
            <code><i /> codegen</code>
          </span>
        </button>

        <div className="runtime-ledger">
          <LockMark />
          <span><strong>Evaluator-only state</strong><small>no staged score feedback</small></span>
        </div>
      </div>

      <p className="loop-stage-description" aria-live="polite">
        <strong>{active.label}</strong>
        <span>{active.detail}</span>
      </p>
    </div>
  );
}
