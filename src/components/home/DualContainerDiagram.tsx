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
  points: number; // samples per closed path
  fromDock: { x: number; y: number }; // right Docker (ball starts here)
  toDock: { x: number; y: number }; // left Docker (ball ends here)
};

const desktopGeo: LoopGeometry = {
  cx: 500, cy: 230, radius: 96, reach: 182, height: 92, points: 220,
  fromDock: { x: 812, y: 230 },
  toDock: { x: 188, y: 230 },
};
const mobileGeo: LoopGeometry = {
  cx: 180, cy: 350, radius: 62, reach: 118, height: 60, points: 220,
  fromDock: { x: 180, y: 560 },
  toDock: { x: 180, y: 140 },
};

const TAU = Math.PI * 2;

function circlePoint(geo: LoopGeometry, t: number) {
  return { x: geo.cx + geo.radius * Math.cos(t), y: geo.cy + geo.radius * Math.sin(t) };
}

function infinityPoint(geo: LoopGeometry, t: number) {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return { x: geo.cx + geo.reach * c, y: geo.cy + geo.height * s * c };
}

function loopPoint(geo: LoopGeometry, t: number, morph: number) {
  const a = circlePoint(geo, t);
  const b = infinityPoint(geo, t);
  return { x: a.x + (b.x - a.x) * morph, y: a.y + (b.y - a.y) * morph };
}

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

function lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, u: number) {
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}

function wrapAngle(value: number) {
  const wrapped = value % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

function angularDistance(a: number, b: number) {
  const diff = Math.abs(wrapAngle(a) - wrapAngle(b));
  return Math.min(diff, TAU - diff);
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

// The particle drives the rope: contact deforms locally first, tension spreads
// across the loop, then the line releases with a damped recoil.
function useLoopSimulation(geo: LoopGeometry, active: boolean) {
  const shapeRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGPathElement | null>(null);
  const particleRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const cycle = 11.2;
    const samples = geo.points;
    const approachEnd = 0.18;
    const pullEnd = 0.58;
    const tautEnd = 0.68;
    const releaseEnd = 0.92;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function contactPair(forward: boolean) {
      const startT = forward ? 0 : Math.PI;
      const endT = startT + Math.PI;
      return {
        startDock: forward ? geo.fromDock : geo.toDock,
        endDock: forward ? geo.toDock : geo.fromDock,
        startT,
        endT,
        startPoint: circlePoint(geo, startT),
        endPoint: circlePoint(geo, endT),
      };
    }

    function stateAt(progress: number, forward: boolean) {
      const pair = contactPair(forward);

      if (progress < approachEnd) {
        const u = easeInOut(progress / approachEnd);
        return {
          ball: lerpPoint(pair.startDock, pair.startPoint, u),
          frontT: pair.startT,
          pull: 0,
          global: 0,
          contact: 0,
          recoil: 0,
        };
      }

      if (progress < pullEnd) {
        const u = easeInOut((progress - approachEnd) / (pullEnd - approachEnd));
        const frontT = pair.startT + u * Math.PI;
        return {
          ball: infinityPoint(geo, frontT),
          frontT,
          pull: u,
          global: smoothstep((u - 0.24) / 0.76),
          contact: 1,
          recoil: 0,
        };
      }

      if (progress < tautEnd) {
        return {
          ball: infinityPoint(geo, pair.endT),
          frontT: pair.endT,
          pull: 1,
          global: 1,
          contact: 0.7,
          recoil: 0,
        };
      }

      if (progress < releaseEnd) {
        const u = (progress - tautEnd) / (releaseEnd - tautEnd);
        const eased = easeInOut(u);
        const spring = Math.sin(u * Math.PI * 4.5) * Math.exp(-3.4 * u);
        return {
          ball: lerpPoint(pair.endPoint, pair.endDock, eased),
          frontT: pair.endT,
          pull: 1,
          global: clamp01((1 - eased) ** 1.65 + spring * 0.12),
          contact: 0,
          recoil: spring,
        };
      }

      return {
        ball: pair.endDock,
        frontT: pair.endT,
        pull: 0,
        global: 0,
        contact: 0,
        recoil: 0,
      };
    }

    function buildPath(state: ReturnType<typeof stateAt>, forward: boolean) {
      const pair = contactPair(forward);
      const front = clamp01(state.pull) * Math.PI;
      const points: Array<{ x: number; y: number }> = [];

      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * TAU;
        const relative = wrapAngle(t - pair.startT);
        const wake = smoothstep((front - relative + 0.65) / 1.28);
        const dist = angularDistance(t, state.frontT);
        const local = Math.exp(-(dist * dist) / 0.78) * state.contact;
        const morph = clamp01(state.global + wake * 0.26 + local * 0.36);
        const pt = loopPoint(geo, t, morph);

        if (local > 0.001) {
          pt.x = lerp(pt.x, state.ball.x, local * 0.09);
          pt.y = lerp(pt.y, state.ball.y, local * 0.09);
        }

        if (Math.abs(state.recoil) > 0.001) {
          const ripple = Math.sin(t * 3 + (forward ? 0 : Math.PI)) * state.recoil;
          pt.x += Math.cos(t) * geo.radius * ripple * 0.07;
          pt.y += Math.sin(t) * geo.height * ripple * 0.18;
        }

        points.push(pt);
      }

      let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
      for (let i = 0; i < points.length; i++) {
        const p0 = points[(i - 1 + points.length) % points.length];
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 2) % points.length];
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        d += `C${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
      }

      return `${d}Z`;
    }

    function render(state: ReturnType<typeof stateAt>, forward: boolean) {
      const path = buildPath(state, forward);
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
      render(stateAt(p, forward), forward);
      raf = window.requestAnimationFrame(frame);
    }

    if (reduce) {
      render({ ball: geo.fromDock, frontT: 0, pull: 0, global: 0, contact: 0, recoil: 0 }, true);
    } else {
      render(stateAt(0, true), true);
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
