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
type RopeParticle = Point & { px: number; py: number };
type MotionState = {
  contact: number;
  target: Point;
  visualBall: Point;
  tension: number;
  attach: number;
};

const ROPE_POINTS = 96;
const REST_TENSION = 0.1;
const TWO_PI = Math.PI * 2;

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

function circularDistance(a: number, b: number, count: number) {
  const d = Math.abs(a - b) % count;
  return Math.min(d, count - d);
}

function thetaForIndex(index: number, count = ROPE_POINTS) {
  return (index / count) * TWO_PI;
}

function ropeShapePoint(geo: LoopGeometry, theta: number, tension: number) {
  const circle = {
    x: geo.cx + Math.cos(theta) * geo.radius,
    y: geo.cy + Math.sin(theta) * geo.radius,
  };
  const infinity = {
    x: geo.cx + Math.cos(theta) * geo.reach,
    y: geo.cy + Math.sin(theta * 2) * geo.height,
  };

  return lerpPoint(circle, infinity, smoothstep(tension));
}

function createRope(geo: LoopGeometry) {
  return Array.from({ length: ROPE_POINTS }, (_, index): RopeParticle => {
    const point = ropeShapePoint(geo, thetaForIndex(index), REST_TENSION);
    return { ...point, px: point.x, py: point.y };
  });
}

function pointAtContact(points: RopeParticle[], contact: number) {
  const count = points.length;
  const wrapped = ((contact % count) + count) % count;
  const base = Math.floor(wrapped);
  const next = (base + 1) % count;
  return lerpPoint(points[base], points[next], wrapped - base);
}

function applySoftAttachment(points: RopeParticle[], contact: number, target: Point, strength: number) {
  if (strength <= 0) return;

  const current = pointAtContact(points, contact);
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const count = points.length;

  points.forEach((point, index) => {
    const distance = circularDistance(index, contact, count);
    const weight = Math.exp(-(distance * distance) / 72) * strength;
    point.x += dx * weight;
    point.y += dy * weight;
    point.px += dx * weight;
    point.py += dy * weight;
  });
}

function segmentLength(geo: LoopGeometry, index: number, tension: number, count = ROPE_POINTS) {
  const current = ropeShapePoint(geo, thetaForIndex(index, count), tension);
  const next = ropeShapePoint(geo, thetaForIndex(index + 1, count), tension);
  return Math.hypot(next.x - current.x, next.y - current.y);
}

function relaxSegments(points: RopeParticle[], geo: LoopGeometry, tension: number) {
  const count = points.length;

  for (let iteration = 0; iteration < 16; iteration += 1) {
    for (let index = 0; index < count; index += 1) {
      const point = points[index];
      const next = points[(index + 1) % count];
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const distance = Math.hypot(dx, dy) || 0.001;
      const wanted = segmentLength(geo, index, tension, count);
      const correction = ((distance - wanted) / distance) * 0.5;
      const x = dx * correction;
      const y = dy * correction;

      point.x += x;
      point.y += y;
      next.x -= x;
      next.y -= y;
    }
  }
}

function stepRope(points: RopeParticle[], geo: LoopGeometry, state: MotionState) {
  const shapePull = lerp(0.014, 0.046, state.tension);
  const damping = 0.58;

  points.forEach((point, index) => {
    const vx = (point.x - point.px) * damping;
    const vy = (point.y - point.py) * damping;
    const target = ropeShapePoint(geo, thetaForIndex(index, points.length), state.tension);
    const distance = circularDistance(index, state.contact, points.length);
    const waveRadius = lerp(48, 760, smoothstep(state.tension));
    const wavePull = Math.exp(-(distance * distance) / waveRadius);
    const localPull = shapePull * (0.42 + wavePull * 0.85);

    point.px = point.x;
    point.py = point.y;
    point.x += vx + (target.x - point.x) * localPull;
    point.y += vy + (target.y - point.y) * localPull;
  });

  applySoftAttachment(points, state.contact, state.target, state.attach * 0.46);
  relaxSegments(points, geo, state.tension);
  applySoftAttachment(points, state.contact, state.target, state.attach * 0.22);
  relaxSegments(points, geo, state.tension);
}

function smoothedRope(points: RopeParticle[]) {
  let smoothed = points.map(({ x, y }) => ({ x, y }));

  for (let pass = 0; pass < 5; pass += 1) {
    smoothed = smoothed.map((point, index, loop) => {
      const previous = loop[(index - 1 + loop.length) % loop.length];
      const next = loop[(index + 1) % loop.length];
      return {
        x: previous.x * 0.24 + point.x * 0.52 + next.x * 0.24,
        y: previous.y * 0.24 + point.y * 0.52 + next.y * 0.24,
      };
    });
  }

  return smoothed;
}

function closedSplinePath(points: Point[]) {
  const count = points.length;
  const commands = [`M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  const smoothing = 0.68;

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

// A small Verlet rope: the particle pulls a soft contact patch, constraints carry
// the rest of the loop into an infinity shape, then the same rope recoils.
function useLoopSimulation(geo: LoopGeometry, active: boolean) {
  const shapeRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGPathElement | null>(null);
  const particleRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    let previous = 0;
    let cycleIndex = -1;
    let points = createRope(geo);
    const cycle = 15.4;
    const approachEnd = 0.19;
    const pullEnd = 0.68;
    const tautEnd = 0.8;
    const releaseEnd = 0.96;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function stateAt(progress: number, forward: boolean): MotionState {
      const startDock = forward ? geo.fromDock : geo.toDock;
      const endDock = forward ? geo.toDock : geo.fromDock;
      const startContact = forward ? 0 : ROPE_POINTS / 2;
      const endContact = forward ? ROPE_POINTS / 2 : ROPE_POINTS;
      const startSide = ropeShapePoint(geo, thetaForIndex(startContact), REST_TENSION);
      const endSide = ropeShapePoint(geo, thetaForIndex(endContact), 1);

      if (progress < approachEnd) {
        const u = easeInOut(progress / approachEnd);
        const attach = smoothstep((u - 0.68) / 0.32);
        const push = {
          x: startSide.x + (forward ? 1 : -1) * 16 * attach,
          y: startSide.y,
        };
        return {
          contact: startContact,
          target: lerpPoint(startSide, push, attach),
          visualBall: lerpPoint(startDock, startSide, u),
          tension: REST_TENSION,
          attach: attach * 0.72,
        };
      }

      if (progress < pullEnd) {
        const u = easeInOut((progress - approachEnd) / (pullEnd - approachEnd));
        const contact = lerp(startContact, endContact, u);
        const theta = thetaForIndex(contact);
        const tension = lerp(REST_TENSION, 1, smoothstep((u - 0.05) / 0.86));

        return {
          contact,
          target: ropeShapePoint(geo, theta, 1),
          visualBall: ropeShapePoint(geo, theta, 1),
          tension,
          attach: 0.92,
        };
      }

      if (progress < tautEnd) {
        return {
          contact: endContact,
          target: endSide,
          visualBall: endSide,
          tension: 1,
          attach: 0.95,
        };
      }

      if (progress < releaseEnd) {
        const u = (progress - tautEnd) / (releaseEnd - tautEnd);
        const eased = easeInOut(u);
        const spring = Math.max(0, Math.sin(u * Math.PI * 2.8)) * Math.exp(-3.8 * u);
        return {
          contact: endContact,
          target: lerpPoint(endSide, endDock, eased),
          visualBall: lerpPoint(endSide, endDock, eased),
          tension: clamp01(REST_TENSION + (1 - eased) ** 1.35 * (1 - REST_TENSION) + spring * 0.07),
          attach: (1 - smoothstep(u)) * 0.5,
        };
      }

      return {
        contact: endContact,
        target: endDock,
        visualBall: endDock,
        tension: REST_TENSION,
        attach: 0,
      };
    }

    function render(state: MotionState) {
      const contactBall = pointAtContact(points, state.contact);
      const ball = lerpPoint(state.visualBall, contactBall, smoothstep(state.attach));
      const path = closedSplinePath(smoothedRope(points));
      shapeRef.current?.setAttribute("d", path);
      highlightRef.current?.setAttribute("d", path);
      shadowRef.current?.setAttribute("d", path);
      particleRef.current?.setAttribute("transform", `translate(${ball.x.toFixed(2)} ${ball.y.toFixed(2)})`);
    }

    function frame(now: number) {
      if (!start) start = now;
      if (!previous) previous = now;
      const elapsed = (now - start) / 1000;
      const nextCycleIndex = Math.floor(elapsed / cycle);
      const p = (elapsed / cycle) % 1;
      const forward = nextCycleIndex % 2 === 0;

      if (cycleIndex !== nextCycleIndex) {
        points = createRope(geo);
        cycleIndex = nextCycleIndex;
      }

      const dt = Math.min((now - previous) / 1000, 1 / 30);
      previous = now;
      const state = stateAt(p, forward);
      const substeps = Math.max(1, Math.ceil(dt / (1 / 90)));

      for (let step = 0; step < substeps; step += 1) {
        stepRope(points, geo, state);
      }

      render(state);
      raf = window.requestAnimationFrame(frame);
    }

    if (reduce) {
      render({
        contact: 0,
        target: ropeShapePoint(geo, 0, REST_TENSION),
        visualBall: geo.fromDock,
        tension: REST_TENSION,
        attach: 0,
      });
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
    : `M${geo.toDock.x + 72} ${geo.cy} C${geo.toDock.x + 128} ${geo.cy - 16} ${geo.cx - geo.reach - 70} ${geo.cy + 16} ${geo.cx - geo.reach} ${geo.cy}`;
  const rightConnector = verticalDockLayout
    ? `M${geo.fromDock.x} ${geo.fromDock.y - 30} C${geo.fromDock.x + 82} ${geo.fromDock.y - 86} ${geo.cx + geo.reach + 42} ${geo.cy + 52} ${geo.cx + geo.reach} ${geo.cy}`
    : `M${geo.fromDock.x - 72} ${geo.cy} C${geo.fromDock.x - 128} ${geo.cy + 16} ${geo.cx + geo.reach + 70} ${geo.cy - 16} ${geo.cx + geo.reach} ${geo.cy}`;

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
