import { useEffect, useRef, useState } from "react";
import { INFINITY_MARK_PATH } from "../brand/InfinityMark";
import { TANGLED_TWIST, makeLoopFrame, twistAt, yawAt } from "../../lib/loopCurve";

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

type Point = { x: number; y: number };

const LOOP_SAMPLE_COUNT = 96;
const TWO_PI = Math.PI * 2;

// The scene reads the same folding loop as the logo, so both marks show one line at one stage
// of the fold. Theta stays a plain 0..2PI orbit parameter along the loop.
let sceneFrame = makeLoopFrame(TANGLED_TWIST, 0);

function setSceneRoll(twist: number, roll: number) {
  sceneFrame = makeLoopFrame(twist, roll);
}

function baseLoopPoint(theta: number): Point {
  return sceneFrame.point(theta / TWO_PI);
}

function closedSplinePath(points: Point[]) {
  const commands = [`M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  const count = points.length;
  const smoothing = 0.72;

  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count];
    const p1 = points[index];
    const p2 = points[(index + 1) % count];
    const p3 = points[(index + 2) % count];
    const c1 = {
      x: p1.x + ((p2.x - p0.x) * smoothing) / 6,
      y: p1.y + ((p2.y - p0.y) * smoothing) / 6,
    };
    const c2 = {
      x: p2.x - ((p3.x - p1.x) * smoothing) / 6,
      y: p2.y - ((p3.y - p1.y) * smoothing) / 6,
    };

    commands.push(
      `C${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }

  return commands.join("");
}

function openSplinePath(points: Point[]) {
  if (points.length < 2) return "";
  const commands = [`M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  const count = points.length;

  for (let index = 0; index < count - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(count - 1, index + 2)];
    commands.push(
      `C${(p1.x + (p2.x - p0.x) / 6).toFixed(2)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(2)} ` +
        `${(p2.x - (p3.x - p1.x) / 6).toFixed(2)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(2)} ` +
        `${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    );
  }

  return commands.join("");
}

// The line is drawn as it stands at this point of the fold. Nothing rides along it and nothing
// pushes it out of shape, so the movement on screen is the fold itself.
function loopFrame() {
  const pathPoints = Array.from({ length: LOOP_SAMPLE_COUNT }, (_, index) =>
    baseLoopPoint((index / LOOP_SAMPLE_COUNT) * TWO_PI),
  );

  // Split the line where it passes through the plane of the page, so the crossing is drawn as a
  // real over and under rather than as a join. The depth comes from the same fold the logo uses,
  // read at the matching point along the loop.
  const openRuns: Point[][] = [];
  const nearRuns: Point[][] = [];
  let run: Point[] = [];
  let runIsFar = sceneFrame.depth(0) < 0;

  for (let index = 0; index <= LOOP_SAMPLE_COUNT; index += 1) {
    const at = index % LOOP_SAMPLE_COUNT;
    const isFar = sceneFrame.depth(at / LOOP_SAMPLE_COUNT) < 0;
    if (isFar !== runIsFar && run.length > 1) {
      run.push(pathPoints[at]);
      (runIsFar ? openRuns : nearRuns).push(run);
      run = [pathPoints[(at - 1 + LOOP_SAMPLE_COUNT) % LOOP_SAMPLE_COUNT]];
      runIsFar = isFar;
    }
    run.push(pathPoints[at]);
  }
  if (run.length > 1) (runIsFar ? openRuns : nearRuns).push(run);

  return {
    path: closedSplinePath(pathPoints),
    far: openRuns.map(openSplinePath).join(""),
    near: nearRuns.map(openSplinePath).join(""),
  };
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
  const shadowRef = useRef<SVGPathElement | null>(null);
  const shapeFarRef = useRef<SVGPathElement | null>(null);
  const shapeNearRef = useRef<SVGPathElement | null>(null);
  const verticalDockLayout = Math.abs(geo.fromDock.x - geo.toDock.x) < 1;
  const iconTransform = loopIconTransform(geo);
  const leftConnector = verticalDockLayout
    ? `M${geo.toDock.x} ${geo.toDock.y + 30} C${geo.toDock.x - 82} ${geo.toDock.y + 86} ${geo.cx - geo.reach - 42} ${geo.cy - 52} ${geo.cx - geo.reach} ${geo.cy}`
    : `M${geo.toDock.x + 72} ${geo.cy} C${geo.toDock.x + 128} ${geo.cy - 16} ${geo.cx - geo.reach - 70} ${geo.cy + 16} ${geo.cx - geo.reach} ${geo.cy}`;
  const rightConnector = verticalDockLayout
    ? `M${geo.fromDock.x} ${geo.fromDock.y - 30} C${geo.fromDock.x + 82} ${geo.fromDock.y - 86} ${geo.cx + geo.reach + 42} ${geo.cy + 52} ${geo.cx + geo.reach} ${geo.cy}`
    : `M${geo.fromDock.x - 72} ${geo.cy} C${geo.fromDock.x - 128} ${geo.cy + 16} ${geo.cx + geo.reach + 70} ${geo.cy - 16} ${geo.cx + geo.reach} ${geo.cy}`;

  useEffect(() => {
    let raf = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function render(now: number) {
      setSceneRoll(twistAt(now), reduce ? 0 : yawAt(now));
      const frame = loopFrame();

      shadowRef.current?.setAttribute("d", frame.path);
      // The crossing is drawn as the line passing in front of itself: the far strand first, then
      // the near strand laid over it. Both carry the same stroke, so the loop is one unbroken
      // colour and the depth is read from the order alone.
      shapeFarRef.current?.setAttribute("d", frame.far);
      shapeNearRef.current?.setAttribute("d", frame.near);

      if (!reduce) raf = window.requestAnimationFrame(render);
    }

    render(0);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true">
      <path className="loop-connector loop-connector-left" d={leftConnector} />
      <path className="loop-connector loop-connector-right" d={rightConnector} />
      <g transform={iconTransform}>
        <path ref={shadowRef} className="loop-core-shadow" d={INFINITY_MARK_PATH} />
        <path ref={shapeFarRef} className="loop-core-shape loop-core-far" d="" />
        <path ref={shapeNearRef} className="loop-core-shape" d={INFINITY_MARK_PATH} />
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
