import { useState } from "react";

type Stage = "edit" | "snapshot" | "verify";

const stageCopy: Record<Stage, { label: string; detail: string }> = {
  edit: {
    label: "Agent workspace",
    detail: "Container A is the only writable workspace; the loop keeps moving as changes accumulate.",
  },
  snapshot: {
    label: "Snapshot flow",
    detail: "A checkpoint crosses the loop at real change points while the agent keeps editing.",
  },
  verify: {
    label: "Isolated verification",
    detail: "Container B runs tests separately and keeps evaluator state private.",
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

const desktopCirclePath =
  "M500 142 C548.6 142 588 181.4 588 230 C588 278.6 548.6 318 500 318 C451.4 318 412 278.6 412 230 C412 181.4 451.4 142 500 142 Z";
const desktopInfinityPath =
  "M500 230 C500 145 320 145 320 230 C320 315 500 315 500 230 C500 145 680 145 680 230 C680 315 500 315 500 230 Z";
const desktopParticlePath =
  "M800 230 C752 230 716 230 680 230 C680 145 500 145 500 230 C500 315 320 315 320 230 C320 145 500 145 500 230 C500 315 680 315 680 230 C716 230 752 230 800 230";

const mobileCirclePath =
  "M180 306 C204.3 306 224 325.7 224 350 C224 374.3 204.3 394 180 394 C155.7 394 136 374.3 136 350 C136 325.7 155.7 306 180 306 Z";
const mobileInfinityPath =
  "M180 350 C180 296 70 296 70 350 C70 404 180 404 180 350 C180 296 290 296 290 350 C290 404 180 404 180 350 Z";
const mobileParticlePath =
  "M180 552 C180 500 290 454 290 350 C290 296 180 296 180 350 C180 404 70 404 70 350 C70 296 180 296 180 350 C180 404 290 404 290 350 C290 452 180 500 180 552";

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
            <linearGradient id="loop-fluid-desktop" x1="0" x2="1">
              <stop offset="0" stopColor="#5e8fe2" stopOpacity=".45" />
              <stop offset=".5" stopColor="#b7d8ff" />
              <stop offset="1" stopColor="#63c7cc" stopOpacity=".72" />
            </linearGradient>
            <linearGradient id="loop-connector-desktop" x1="0" x2="1">
              <stop offset="0" stopColor="#5e8fe2" stopOpacity=".12" />
              <stop offset=".52" stopColor="#90bcff" stopOpacity=".5" />
              <stop offset="1" stopColor="#63c7cc" stopOpacity=".18" />
            </linearGradient>
          </defs>
          <path className="loop-connector loop-connector-left" d="M250 230 C284 230 300 230 320 230" />
          <path className="loop-connector loop-connector-right" d="M750 230 C716 230 700 230 680 230" />
          <path className="loop-core-shadow" d={desktopInfinityPath} />
          <path className="loop-bend-orbit" d={desktopCirclePath} />
          <path className="loop-core-shape" d={desktopInfinityPath} />
          <path className="loop-core-highlight" d={desktopInfinityPath} />
          <g className="loop-particle">
            <circle className="loop-particle-glow" r="19" />
            <circle className="loop-particle-core" r="6.4" />
            <animateMotion dur="8s" path={desktopParticlePath} repeatCount="indefinite" />
          </g>
        </svg>

        <svg className="loop-routes loop-routes-mobile" viewBox="0 0 360 700" aria-hidden="true">
          <defs>
            <linearGradient id="loop-fluid-mobile" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5e8fe2" stopOpacity=".5" />
              <stop offset=".5" stopColor="#b7d8ff" />
              <stop offset="1" stopColor="#63c7cc" stopOpacity=".72" />
            </linearGradient>
            <linearGradient id="loop-connector-mobile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5e8fe2" stopOpacity=".18" />
              <stop offset=".48" stopColor="#90bcff" stopOpacity=".5" />
              <stop offset="1" stopColor="#63c7cc" stopOpacity=".18" />
            </linearGradient>
          </defs>
          <path className="loop-connector loop-connector-left" d="M180 152 C180 220 180 260 180 296" />
          <path className="loop-connector loop-connector-right" d="M180 548 C180 480 180 438 180 404" />
          <path className="loop-core-shadow" d={mobileInfinityPath} />
          <path className="loop-bend-orbit" d={mobileCirclePath} />
          <path className="loop-core-shape" d={mobileInfinityPath} />
          <path className="loop-core-highlight" d={mobileInfinityPath} />
          <g className="loop-particle">
            <circle className="loop-particle-glow" r="17" />
            <circle className="loop-particle-core" r="5.8" />
            <animateMotion dur="8s" path={mobileParticlePath} repeatCount="indefinite" />
          </g>
        </svg>

        <button
          className="infinity-loop-control"
          type="button"
          aria-label="Inspect snapshot flow"
          aria-pressed={activeStage === "snapshot"}
          onClick={() => setActiveStage("snapshot")}
          onMouseEnter={() => setActiveStage("snapshot")}
          onFocus={() => setActiveStage("snapshot")}
        />

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
          <span><strong>Sealed evaluator state</strong><small>no score feedback</small></span>
        </div>
      </div>

      <p className="loop-stage-description" aria-live="polite">
        <strong>{active.label}</strong>
        <span>{active.detail}</span>
      </p>
    </div>
  );
}
