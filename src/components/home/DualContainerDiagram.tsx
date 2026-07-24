import { useState } from "react";
import { INFINITY_MARK_PATH } from "../brand/InfinityMark";

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

type LoopGeometry = {
  cx: number;
  cy: number;
  reach: number;
  height: number;
  fromDock: { x: number; y: number };
  toDock: { x: number; y: number };
};

const desktopGeo: LoopGeometry = {
  cx: 500, cy: 230, reach: 184, height: 78,
  fromDock: { x: 812, y: 230 },
  toDock: { x: 188, y: 230 },
};
const mobileGeo: LoopGeometry = {
  cx: 180, cy: 350, reach: 118, height: 54,
  fromDock: { x: 180, y: 560 },
  toDock: { x: 180, y: 140 },
};

function loopIconTransform(geo: LoopGeometry) {
  const scaleX = geo.reach / 17;
  const scaleY = geo.height / 8;
  return `translate(${geo.cx} ${geo.cy}) scale(${scaleX} ${scaleY}) translate(-21 -16)`;
}

const LOOP_PULL_RIGHT =
  "M21 16 C19.8 8.2, 3.4 8.9, 3.4 15.6 C3.4 23.7, 19.5 24.6, 21 16 C23.2 6.6, 40.2 7, 39.4 16.3 C38.8 25.3, 22.8 24.9, 21 16 Z";
const LOOP_PULL_LEFT =
  "M21 16 C18.6 6.8, 2.4 7.7, 2.8 16.3 C3.2 25.4, 19.2 25.3, 21 16 C22 7.9, 38.5 8.7, 38.9 16.1 C39.3 23.4, 22.1 23.7, 21 16 Z";
const LOOP_DRIFT =
  "M21 16 C20.4 6.3, 4.1 6.9, 3.6 15.4 C3.1 24.5, 20.7 26.3, 21 16 C21.6 7.2, 38 7.6, 38.7 16.6 C39.2 24.8, 21.7 25.1, 21 16 Z";
const LOOP_SQUEEZE =
  "M21 16 C21.8 8.9, 5.4 8.6, 4.3 15.8 C3.4 23.3, 19.8 23.8, 21 16 C22.2 8.2, 36.7 7.7, 37.8 16.1 C38.6 24.1, 20.1 23.5, 21 16 Z";

const LOOP_PATH_VALUES = [
  INFINITY_MARK_PATH,
  LOOP_PULL_RIGHT,
  LOOP_DRIFT,
  INFINITY_MARK_PATH,
  LOOP_PULL_LEFT,
  LOOP_SQUEEZE,
  INFINITY_MARK_PATH,
].join(";");
const LOOP_KEY_TIMES = "0;0.15;0.31;0.48;0.65;0.82;1";
const LOOP_KEY_SPLINES = [
  "0.42 0 0.58 1",
  "0.42 0 0.58 1",
  "0.42 0 0.58 1",
  "0.42 0 0.58 1",
  "0.42 0 0.58 1",
  "0.42 0 0.58 1",
].join(";");

function LoopPathAnimation() {
  return (
    <animate
      attributeName="d"
      dur="7.2s"
      repeatCount="indefinite"
      values={LOOP_PATH_VALUES}
      keyTimes={LOOP_KEY_TIMES}
      calcMode="spline"
      keySplines={LOOP_KEY_SPLINES}
    />
  );
}


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

function LoopScene({ geo, className, viewBox }: { geo: LoopGeometry; className: string; viewBox: string }) {
  const verticalDockLayout = Math.abs(geo.fromDock.x - geo.toDock.x) < 1;
  const iconTransform = loopIconTransform(geo);
  const leftConnector = verticalDockLayout
    ? `M${geo.toDock.x} ${geo.toDock.y + 30} C${geo.toDock.x - 82} ${geo.toDock.y + 86} ${geo.cx - geo.reach - 42} ${geo.cy - 52} ${geo.cx - geo.reach} ${geo.cy}`
    : `M${geo.toDock.x + 72} ${geo.cy} C${geo.toDock.x + 128} ${geo.cy - 16} ${geo.cx - geo.reach - 70} ${geo.cy + 16} ${geo.cx - geo.reach} ${geo.cy}`;
  const rightConnector = verticalDockLayout
    ? `M${geo.fromDock.x} ${geo.fromDock.y - 30} C${geo.fromDock.x + 82} ${geo.fromDock.y - 86} ${geo.cx + geo.reach + 42} ${geo.cy + 52} ${geo.cx + geo.reach} ${geo.cy}`
    : `M${geo.fromDock.x - 72} ${geo.cy} C${geo.fromDock.x - 128} ${geo.cy + 16} ${geo.cx + geo.reach + 70} ${geo.cy - 16} ${geo.cx + geo.reach} ${geo.cy}`;

  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true">
      <path className="loop-connector loop-connector-left" d={leftConnector} />
      <path className="loop-connector loop-connector-right" d={rightConnector} />
      <g transform={iconTransform}>
        <path className="loop-core-shadow" d={INFINITY_MARK_PATH}>
          <LoopPathAnimation />
        </path>
        <path className="loop-core-shape" d={INFINITY_MARK_PATH}>
          <LoopPathAnimation />
        </path>
        <path className="loop-core-flow" d={INFINITY_MARK_PATH}>
          <LoopPathAnimation />
        </path>
        <path className="loop-core-highlight" d={INFINITY_MARK_PATH}>
          <LoopPathAnimation />
        </path>
        <g className="loop-particle loop-particle-trail">
          <animateMotion dur="7.2s" begin="-0.22s" repeatCount="indefinite" path={INFINITY_MARK_PATH} />
          <circle className="loop-particle-trail-dot" r={geo === desktopGeo ? 0.62 : 0.52} />
        </g>
        <g className="loop-particle loop-particle-trail loop-particle-trail-soft">
          <animateMotion dur="7.2s" begin="-0.44s" repeatCount="indefinite" path={INFINITY_MARK_PATH} />
          <circle className="loop-particle-trail-dot" r={geo === desktopGeo ? 0.46 : 0.4} />
        </g>
        <g className="loop-particle">
          <animateMotion dur="7.2s" repeatCount="indefinite" path={INFINITY_MARK_PATH} />
          <circle className="loop-particle-glow" r={geo === desktopGeo ? 1.7 : 1.45}>
            <animate attributeName="opacity" dur="7.2s" repeatCount="indefinite" values="0.16;0.36;0.2;0.42;0.18" keyTimes="0;0.22;0.5;0.72;1" />
            <animate attributeName="r" dur="7.2s" repeatCount="indefinite" values="1.25;1.9;1.45;2.05;1.25" keyTimes="0;0.22;0.5;0.72;1" />
          </circle>
          <circle className="loop-particle-core" r={geo === desktopGeo ? 0.54 : 0.5}>
            <animate attributeName="r" dur="7.2s" repeatCount="indefinite" values="0.48;0.64;0.5;0.68;0.48" keyTimes="0;0.22;0.5;0.72;1" />
          </circle>
        </g>
      </g>
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
        <LoopScene geo={desktopGeo} className="loop-routes loop-routes-desktop" viewBox="0 0 1000 460" />
        <LoopScene geo={mobileGeo} className="loop-routes loop-routes-mobile" viewBox="0 0 360 700" />

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
