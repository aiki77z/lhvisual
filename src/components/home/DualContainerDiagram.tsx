import { useEffect, useRef, useState } from "react";

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
  radius: number; // circle radius at rest
  reach: number; // half-width of each infinity lobe
  height: number; // vertical extent of each lobe
  fromDock: { x: number; y: number }; // right Docker (ball starts here)
  toDock: { x: number; y: number }; // left Docker (ball ends here)
};

const desktopGeo: LoopGeometry = {
  cx: 500, cy: 230, radius: 96, reach: 182, height: 92,
  fromDock: { x: 812, y: 230 },
  toDock: { x: 188, y: 230 },
};
const mobileGeo: LoopGeometry = {
  cx: 180, cy: 350, radius: 62, reach: 118, height: 60,
  fromDock: { x: 180, y: 560 },
  toDock: { x: 180, y: 140 },
};

type Point = { x: number; y: number };
type Direction = 1 | -1;
type RopeState = {
  ball: Point;
  side: Direction;
  tension: number;
  impact: number;
  recoil: number;
};

function clamp01(value: number) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(value: number) {
  const u = clamp01(value);
  return u * u * (3 - 2 * u);
}

function easeInOut(value: number) {
  const u = clamp01(value);
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
}

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function lerpPoint(a: Point, b: Point, u: number) {
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, u: number) {
  const a = 1 - u;
  const aa = a * a;
  const uu = u * u;
  return {
    x: aa * a * p0.x + 3 * aa * u * p1.x + 3 * a * uu * p2.x + uu * u * p3.x,
    y: aa * a * p0.y + 3 * aa * u * p1.y + 3 * a * uu * p2.y + uu * u * p3.y,
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

// The particle drives one continuous cubic rope: impact stretches one side,
// tension pulls it into an infinity loop, then the same curve recoils back.
function useLoopSimulation(geo: LoopGeometry, active: boolean) {
  const shapeRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGPathElement | null>(null);
  const particleRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const cycle = 10.8;
    const approachEnd = 0.2;
    const pullEnd = 0.62;
    const tautEnd = 0.72;
    const releaseEnd = 0.95;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function sidePoint(side: Direction, tension: number) {
      const rest = { x: geo.cx + side * geo.radius, y: geo.cy };
      const taut = { x: geo.cx + side * geo.reach, y: geo.cy };
      return lerpPoint(rest, taut, tension);
    }

    function infinityControls() {
      const r = geo.reach;
      const h = geo.height;
      const c = geo.cx;
      const y = geo.cy;
      return {
        right: { x: c + r, y },
        left: { x: c - r, y },
        center: { x: c, y },
        c0a: { x: c + r, y: y - h },
        c0b: { x: c + r * 0.44, y: y - h },
        c1a: { x: c - r * 0.44, y: y + h },
        c1b: { x: c - r, y: y + h },
        c2a: { x: c - r, y: y - h },
        c2b: { x: c - r * 0.44, y: y - h },
        c3a: { x: c + r * 0.44, y: y + h },
        c3b: { x: c + r, y: y + h },
      };
    }

    function shapeFor(state: RopeState) {
      const k = 0.5522847498;
      const t = clamp01(state.tension);
      const r = geo.radius;
      const h = geo.height;
      const c = geo.cx;
      const y = geo.cy;
      const recoil = state.recoil;
      const rightBias = state.side === 1 ? state.impact : 0;
      const leftBias = state.side === -1 ? state.impact : 0;

      const rightRest = { x: c + r, y };
      const leftRest = { x: c - r, y };
      const topRest = { x: c, y: y - r };
      const bottomRest = { x: c, y: y + r };
      const inf = infinityControls();

      const right = lerpPoint(rightRest, inf.right, t);
      const top = lerpPoint(topRest, inf.center, t);
      const left = lerpPoint(leftRest, inf.left, t);
      const bottom = lerpPoint(bottomRest, inf.center, t);

      right.x += rightBias * 34;
      left.x -= leftBias * 34;
      top.y -= recoil * h * 0.1;
      bottom.y += recoil * h * 0.1;

      const c0a = lerpPoint({ x: rightRest.x, y: y - k * r }, inf.c0a, t);
      const c0b = lerpPoint({ x: c + k * r, y: topRest.y }, inf.c0b, t);
      const c1a = lerpPoint({ x: c - k * r, y: topRest.y }, inf.c1a, t);
      const c1b = lerpPoint({ x: leftRest.x, y: y - k * r }, inf.c1b, t);
      const c2a = lerpPoint({ x: leftRest.x, y: y + k * r }, inf.c2a, t);
      const c2b = lerpPoint({ x: c - k * r, y: bottomRest.y }, inf.c2b, t);
      const c3a = lerpPoint({ x: c + k * r, y: bottomRest.y }, inf.c3a, t);
      const c3b = lerpPoint({ x: rightRest.x, y: y + k * r }, inf.c3b, t);

      c0a.x += rightBias * 25;
      c3b.x += rightBias * 25;
      c1b.x -= leftBias * 25;
      c2a.x -= leftBias * 25;

      return { right, top, left, bottom, c0a, c0b, c1a, c1b, c2a, c2b, c3a, c3b };
    }

    function pointOnRope(shape: ReturnType<typeof shapeFor>, side: Direction, u: number) {
      const t = clamp01(u);

      if (side === 1) {
        if (t < 0.5) {
          return cubicPoint(shape.right, shape.c0a, shape.c0b, shape.top, t * 2);
        }
        return cubicPoint(shape.top, shape.c1a, shape.c1b, shape.left, (t - 0.5) * 2);
      }

      if (t < 0.5) {
        return cubicPoint(shape.left, shape.c2a, shape.c2b, shape.bottom, t * 2);
      }
      return cubicPoint(shape.bottom, shape.c3a, shape.c3b, shape.right, (t - 0.5) * 2);
    }

    function stateAt(progress: number, forward: boolean): RopeState {
      const side: Direction = forward ? 1 : -1;
      const startDock = forward ? geo.fromDock : geo.toDock;
      const endDock = forward ? geo.toDock : geo.fromDock;
      const startSide = sidePoint(side, 0);
      const tautState = { ball: startSide, side, tension: 1, impact: 0, recoil: 0 };
      const endSide = pointOnRope(shapeFor(tautState), side, 1);

      if (progress < approachEnd) {
        const u = easeInOut(progress / approachEnd);
        return {
          ball: lerpPoint(startDock, startSide, u),
          side,
          tension: 0,
          impact: smoothstep((u - 0.72) / 0.28),
          recoil: 0,
        };
      }

      if (progress < pullEnd) {
        const u = easeInOut((progress - approachEnd) / (pullEnd - approachEnd));
        const state = {
          ball: startSide,
          side,
          tension: smoothstep((u - 0.08) / 0.92),
          impact: (1 - u) * 0.7,
          recoil: 0,
        };
        return { ...state, ball: pointOnRope(shapeFor(state), side, u) };
      }

      if (progress < tautEnd) {
        return { ...tautState, ball: endSide };
      }

      if (progress < releaseEnd) {
        const u = (progress - tautEnd) / (releaseEnd - tautEnd);
        const eased = easeInOut(u);
        const spring = Math.sin(u * Math.PI * 4) * Math.exp(-3.8 * u);
        return {
          ball: lerpPoint(endSide, endDock, eased),
          side,
          tension: clamp01((1 - eased) ** 1.45 + spring * 0.08),
          impact: 0,
          recoil: spring,
        };
      }

      return {
        ball: endDock,
        side,
        tension: 0,
        impact: 0,
        recoil: 0,
      };
    }

    function buildPath(state: RopeState) {
      const { right, top, left, bottom, c0a, c0b, c1a, c1b, c2a, c2b, c3a, c3b } = shapeFor(state);

      return [
        `M${right.x.toFixed(2)} ${right.y.toFixed(2)}`,
        `C${c0a.x.toFixed(2)} ${c0a.y.toFixed(2)} ${c0b.x.toFixed(2)} ${c0b.y.toFixed(2)} ${top.x.toFixed(2)} ${top.y.toFixed(2)}`,
        `C${c1a.x.toFixed(2)} ${c1a.y.toFixed(2)} ${c1b.x.toFixed(2)} ${c1b.y.toFixed(2)} ${left.x.toFixed(2)} ${left.y.toFixed(2)}`,
        `C${c2a.x.toFixed(2)} ${c2a.y.toFixed(2)} ${c2b.x.toFixed(2)} ${c2b.y.toFixed(2)} ${bottom.x.toFixed(2)} ${bottom.y.toFixed(2)}`,
        `C${c3a.x.toFixed(2)} ${c3a.y.toFixed(2)} ${c3b.x.toFixed(2)} ${c3b.y.toFixed(2)} ${right.x.toFixed(2)} ${right.y.toFixed(2)}`,
        "Z",
      ].join("");
    }

    function render(state: RopeState) {
      const path = buildPath(state);
      shapeRef.current?.setAttribute("d", path);
      highlightRef.current?.setAttribute("d", path);
      shadowRef.current?.setAttribute("d", path);
      particleRef.current?.setAttribute("transform", `translate(${state.ball.x.toFixed(2)} ${state.ball.y.toFixed(2)})`);
    }

    function frame(now: number) {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      const cycleIndex = Math.floor(elapsed / cycle);
      const p = (elapsed / cycle) % 1;
      const forward = cycleIndex % 2 === 0;
      render(stateAt(p, forward));
      raf = window.requestAnimationFrame(frame);
    }

    if (reduce) {
      render({ ball: geo.fromDock, side: 1, tension: 0, impact: 0, recoil: 0 });
    } else {
      render(stateAt(0, true));
      if (active) raf = window.requestAnimationFrame(frame);
    }
    return () => window.cancelAnimationFrame(raf);
  }, [geo, active]);

  return { shapeRef, highlightRef, shadowRef, particleRef };
}

function LoopScene({ geo, className, viewBox }: { geo: LoopGeometry; className: string; viewBox: string }) {
  const { shapeRef, highlightRef, shadowRef, particleRef } = useLoopSimulation(geo, true);
  const verticalDockLayout = Math.abs(geo.fromDock.x - geo.toDock.x) < 1;
  const leftConnector = verticalDockLayout
    ? `M${geo.toDock.x} ${geo.toDock.y + 30} C${geo.toDock.x - 82} ${geo.toDock.y + 86} ${geo.cx - geo.reach - 42} ${geo.cy - 52} ${geo.cx - geo.reach} ${geo.cy}`
    : `M${geo.toDock.x + 72} ${geo.cy} L${geo.cx - geo.reach} ${geo.cy}`;
  const rightConnector = verticalDockLayout
    ? `M${geo.fromDock.x} ${geo.fromDock.y - 30} C${geo.fromDock.x + 82} ${geo.fromDock.y - 86} ${geo.cx + geo.reach + 42} ${geo.cy + 52} ${geo.cx + geo.reach} ${geo.cy}`
    : `M${geo.fromDock.x - 72} ${geo.cy} L${geo.cx + geo.reach} ${geo.cy}`;

  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true">
      <path className="loop-connector loop-connector-left" d={leftConnector} />
      <path className="loop-connector loop-connector-right" d={rightConnector} />
      <path ref={shadowRef} className="loop-core-shadow" />
      <path ref={shapeRef} className="loop-core-shape" />
      <path ref={highlightRef} className="loop-core-highlight" />
      <g ref={particleRef} className="loop-particle">
        <circle className="loop-particle-glow" r={geo === desktopGeo ? 17 : 13} />
        <circle className="loop-particle-core" r={geo === desktopGeo ? 6.4 : 5.8} />
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
