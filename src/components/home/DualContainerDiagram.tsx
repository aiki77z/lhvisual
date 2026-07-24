import { useEffect, useRef, useState } from "react";
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

type Point = { x: number; y: number };

const LOOP_CENTER = { x: 21, y: 16 };
const LOOP_SAMPLE_COUNT = 96;
const LOOP_CYCLE_MS = 9200;
const TWO_PI = Math.PI * 2;
const RIGHT_EDGE_THETA = TWO_PI * 0.75;
const LOGO_SEGMENTS = [
  [{ x: 21, y: 16 }, { x: 21, y: 8 }, { x: 4, y: 8 }, { x: 4, y: 16 }],
  [{ x: 4, y: 16 }, { x: 4, y: 24 }, { x: 21, y: 24 }, { x: 21, y: 16 }],
  [{ x: 21, y: 16 }, { x: 21, y: 8 }, { x: 38, y: 8 }, { x: 38, y: 16 }],
  [{ x: 38, y: 16 }, { x: 38, y: 24 }, { x: 21, y: 24 }, { x: 21, y: 16 }],
] as const;

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(value: number) {
  const t = clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function mixPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function cubicPoint(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const p = 1 - t;
  return {
    x: p ** 3 * a.x + 3 * p * p * t * b.x + 3 * p * t * t * c.x + t ** 3 * d.x,
    y: p ** 3 * a.y + 3 * p * p * t * b.y + 3 * p * t * t * c.y + t ** 3 * d.y,
  };
}

function limitedVector(vector: Point, maxLength: number): Point {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= maxLength || length === 0) return vector;
  const scale = maxLength / length;
  return { x: vector.x * scale, y: vector.y * scale };
}

function cubicAt(segment: readonly Point[], u: number): Point {
  const p0 = segment[0];
  const p1 = segment[1];
  const p2 = segment[2];
  const p3 = segment[3];
  const a = 1 - u;
  return {
    x: a ** 3 * p0.x + 3 * a * a * u * p1.x + 3 * a * u * u * p2.x + u ** 3 * p3.x,
    y: a ** 3 * p0.y + 3 * a * a * u * p1.y + 3 * a * u * u * p2.y + u ** 3 * p3.y,
  };
}

function cubicTangentAt(segment: readonly Point[], u: number): Point {
  const p0 = segment[0];
  const p1 = segment[1];
  const p2 = segment[2];
  const p3 = segment[3];
  const a = 1 - u;
  return {
    x: 3 * a * a * (p1.x - p0.x) + 6 * a * u * (p2.x - p1.x) + 3 * u * u * (p3.x - p2.x),
    y: 3 * a * a * (p1.y - p0.y) + 6 * a * u * (p2.y - p1.y) + 3 * u * u * (p3.y - p2.y),
  };
}

function segmentAt(theta: number) {
  const progress = (((theta / TWO_PI) % 1) + 1) % 1;
  const scaled = progress * LOGO_SEGMENTS.length;
  const index = Math.min(LOGO_SEGMENTS.length - 1, Math.floor(scaled));
  return { segment: LOGO_SEGMENTS[index], u: scaled - index };
}

function baseLoopPoint(theta: number): Point {
  const { segment, u } = segmentAt(theta);
  return cubicAt(segment, u);
}

function baseLoopTangent(theta: number): Point {
  const { segment, u } = segmentAt(theta);
  const tangent = cubicTangentAt(segment, u);
  const length = Math.hypot(tangent.x, tangent.y) || 1;
  return { x: tangent.x / length, y: tangent.y / length };
}

function baseLoopNormal(theta: number): Point {
  const tangent = baseLoopTangent(theta);
  return { x: -tangent.y, y: tangent.x };
}

function baseLoopOutward(theta: number): Point {
  const base = baseLoopPoint(theta);
  const radial = { x: base.x - LOOP_CENTER.x, y: base.y - LOOP_CENTER.y };
  const length = Math.hypot(radial.x, radial.y);
  if (length > 0.6) return { x: radial.x / length, y: radial.y / length };
  return baseLoopNormal(theta);
}

function localPointFromScene(geo: LoopGeometry, point: Point): Point {
  const scaleX = geo.reach / 17;
  const scaleY = geo.height / 8;
  return {
    x: LOOP_CENTER.x + (point.x - geo.cx) / scaleX,
    y: LOOP_CENTER.y + (point.y - geo.cy) / scaleY,
  };
}

function deformedLoopPoint(theta: number, contactTheta: number, particlePoint: Point, influence: number): Point {
  const base = baseLoopPoint(theta);
  const anchor = baseLoopPoint(contactTheta);
  const pullVector = limitedVector(
    { x: particlePoint.x - anchor.x, y: particlePoint.y - anchor.y },
    2.15 * influence,
  );
  const tangent = baseLoopTangent(contactTheta);
  const distance = wrapAngle(theta - contactTheta);
  const contact = Math.exp(-(distance * distance) / 0.052);
  const shoulder = Math.exp(-(distance * distance) / 0.22);
  const wake = Math.exp(-((distance + 0.38) * (distance + 0.38)) / 0.13);
  const counterWake = Math.exp(-((distance - 0.34) * (distance - 0.34)) / 0.15);
  const ripple = (wake - counterWake) * 0.38 * influence;
  const drag = contact * 0.9 + shoulder * 0.12;

  return {
    x: base.x + pullVector.x * drag + tangent.x * ripple,
    y: base.y + pullVector.y * drag + tangent.y * ripple,
  };
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

function loopFrame(phase: number, fromDockLocal: Point) {
  const enterEnd = 0.18;
  const exitStart = 0.88;
  const rightEdge = baseLoopPoint(RIGHT_EDGE_THETA);
  const rightOutward = baseLoopOutward(RIGHT_EDGE_THETA);
  let contactTheta = RIGHT_EDGE_THETA;
  let influence = 0;
  let particlePoint = fromDockLocal;

  if (phase < enterEnd) {
    const t = easeInOut(phase / enterEnd);
    const target = {
      x: rightEdge.x + rightOutward.x * 0.92,
      y: rightEdge.y + rightOutward.y * 0.92,
    };
    particlePoint = cubicPoint(
      fromDockLocal,
      mixPoint(fromDockLocal, target, 0.42),
      { x: target.x + 2.8, y: target.y - 1.2 },
      target,
      t,
    );
    influence = easeInOut(t) * 0.95;
  } else if (phase < exitStart) {
    const t = (phase - enterEnd) / (exitStart - enterEnd);
    const orbitalEase = easeInOut(t);
    contactTheta = RIGHT_EDGE_THETA + orbitalEase * TWO_PI;
    const base = baseLoopPoint(contactTheta);
    const outward = baseLoopOutward(contactTheta);
    const tangent = baseLoopTangent(contactTheta);
    const lead = 0.82 + 0.2 * Math.sin(Math.PI * t) + 0.06 * Math.sin(TWO_PI * t * 3);
    particlePoint = {
      x: base.x + outward.x * lead + tangent.x * 0.12 * Math.sin(TWO_PI * t * 2),
      y: base.y + outward.y * lead + tangent.y * 0.12 * Math.sin(TWO_PI * t * 2),
    };
    influence = 0.9 + 0.1 * Math.sin(Math.PI * t);
  } else {
    const t = easeInOut((phase - exitStart) / (1 - exitStart));
    const start = {
      x: rightEdge.x + rightOutward.x * 0.92,
      y: rightEdge.y + rightOutward.y * 0.92,
    };
    particlePoint = cubicPoint(
      start,
      { x: start.x + 3.2, y: start.y + 1.4 },
      mixPoint(start, fromDockLocal, 0.48),
      fromDockLocal,
      t,
    );
    influence = (1 - t) * 0.9;
  }

  const pathPoints = Array.from({ length: LOOP_SAMPLE_COUNT }, (_, index) => {
    const theta = (index / LOOP_SAMPLE_COUNT) * TWO_PI;
    return deformedLoopPoint(theta, contactTheta, particlePoint, influence);
  });

  const trailPoint = mixPoint(
    deformedLoopPoint(contactTheta - 0.18, contactTheta, particlePoint, influence),
    particlePoint,
    0.28,
  );
  const softTrailPoint = mixPoint(
    deformedLoopPoint(contactTheta - 0.38, contactTheta, particlePoint, influence),
    particlePoint,
    0.18,
  );

  return {
    path: closedSplinePath(pathPoints),
    particlePoint,
    trailPoint,
    softTrailPoint,
    glow: 1.35 + influence * 0.55,
    core: 0.5 + influence * 0.1,
  };
}

function setTransform(node: SVGGElement | null, point: Point) {
  node?.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
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
  const liquidRef = useRef<SVGPathElement | null>(null);
  const shapeRef = useRef<SVGPathElement | null>(null);
  const flowRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<SVGPathElement | null>(null);
  const particleRef = useRef<SVGGElement | null>(null);
  const trailRef = useRef<SVGGElement | null>(null);
  const softTrailRef = useRef<SVGGElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);
  const coreRef = useRef<SVGCircleElement | null>(null);
  const verticalDockLayout = Math.abs(geo.fromDock.x - geo.toDock.x) < 1;
  const iconTransform = loopIconTransform(geo);
  const fromDockLocal = localPointFromScene(geo, geo.fromDock);
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
      const phase = reduce ? 0.12 : (now % LOOP_CYCLE_MS) / LOOP_CYCLE_MS;
      const frame = loopFrame(phase, fromDockLocal);

      [shadowRef.current, liquidRef.current, shapeRef.current, flowRef.current, highlightRef.current]
        .forEach((path) => path?.setAttribute("d", frame.path));
      setTransform(particleRef.current, frame.particlePoint);
      setTransform(trailRef.current, frame.trailPoint);
      setTransform(softTrailRef.current, frame.softTrailPoint);
      glowRef.current?.setAttribute("r", frame.glow.toFixed(2));
      glowRef.current?.setAttribute("opacity", (0.16 + frame.glow * 0.11).toFixed(2));
      coreRef.current?.setAttribute("r", frame.core.toFixed(2));

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
        <path ref={liquidRef} className="loop-core-liquid" d={INFINITY_MARK_PATH} />
        <path ref={shapeRef} className="loop-core-shape" d={INFINITY_MARK_PATH} />
        <path ref={flowRef} className="loop-core-flow" d={INFINITY_MARK_PATH} />
        <path ref={highlightRef} className="loop-core-highlight" d={INFINITY_MARK_PATH} />
        <g ref={trailRef} className="loop-particle loop-particle-trail">
          <circle className="loop-particle-trail-dot" r={geo === desktopGeo ? 0.62 : 0.52} />
        </g>
        <g ref={softTrailRef} className="loop-particle loop-particle-trail loop-particle-trail-soft">
          <circle className="loop-particle-trail-dot" r={geo === desktopGeo ? 0.46 : 0.4} />
        </g>
        <g ref={particleRef} className="loop-particle">
          <circle ref={glowRef} className="loop-particle-glow" r={geo === desktopGeo ? 1.7 : 1.45} />
          <circle ref={coreRef} className="loop-particle-core" r={geo === desktopGeo ? 0.54 : 0.5} />
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
