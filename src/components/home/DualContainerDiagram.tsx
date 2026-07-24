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

// The loop is one closed curve that morphs between a circle (morph=0) and a
// full lemniscate / infinity sign (morph=1). Same parameter t indexes matching
// points on both shapes so they interpolate smoothly.
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
  cx: 500, cy: 230, radius: 96, reach: 182, height: 92, points: 160,
  fromDock: { x: 812, y: 230 },
  toDock: { x: 188, y: 230 },
};
const mobileGeo: LoopGeometry = {
  cx: 180, cy: 350, radius: 62, reach: 118, height: 60, points: 160,
  fromDock: { x: 180, y: 560 },
  toDock: { x: 180, y: 140 },
};

// Point on the rest circle for parameter t in [0, 2pi).
function circlePoint(geo: LoopGeometry, t: number) {
  return { x: geo.cx + geo.radius * Math.cos(t), y: geo.cy + geo.radius * Math.sin(t) };
}

// Point on the lemniscate (figure eight) for the same t. Gerono form: the curve
// sweeps out to +reach, back through the waist, out to -reach, and home.
function infinityPoint(geo: LoopGeometry, t: number) {
  const s = Math.sin(t);
  const c = Math.cos(t);
  return { x: geo.cx + geo.reach * s, y: geo.cy + geo.height * s * c };
}

// Blend circle -> infinity by morph in [0, 1].
function loopPoint(geo: LoopGeometry, t: number, morph: number) {
  const a = circlePoint(geo, t);
  const b = infinityPoint(geo, t);
  return { x: a.x + (b.x - a.x) * morph, y: a.y + (b.y - a.y) * morph };
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

// A ball travels from the right Docker station through the loop to the left
// Docker (then back). The curve deforms in step with the ball's position: it is
// a circle at rest, and as the ball pushes through it twists into the infinity
// sign, peaking as the ball crosses center, easing back as it exits. The line
// reacts to actual contact, not a detached timer.
function useLoopSimulation(geo: LoopGeometry, active: boolean) {
  const shapeRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGPathElement | null>(null);
  const particleRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const n = geo.points;
    let raf = 0;
    let start = 0;
    const cycle = 6.5; // seconds per strike cycle

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
    const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);
    const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

    // The loop spans this far to each side along the ball's travel axis. The ball
    // is "in contact" with the curve while it is inside this band; the morph is
    // driven by how deep into the band the ball is, so the line reacts to the
    // ball's actual position rather than a detached timer.
    const contactSpan = geo.reach + 20;
    const axis = geo.fromDock.x !== geo.toDock.x ? "x" : "y";
    const center = axis === "x" ? geo.cx : geo.cy;

    // Ball travels right Docker -> left Docker, then back. One full round trip
    // per cycle so both stations take turns firing.
    function ballAt(p: number) {
      const a = geo.fromDock;
      const b = geo.toDock;
      if (p < 0.5) {
        const u = easeInOut(p / 0.5); // from -> to
        return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
      }
      const u = easeInOut((p - 0.5) / 0.5); // to -> from
      return { x: lerp(b.x, a.x, u), y: lerp(b.y, a.y, u) };
    }

    // Morph tracks the ball: 0 while outside the loop, rising as it pushes in,
    // full infinity as it passes dead center, easing back as it exits.
    function morphFor(ball: { x: number; y: number }) {
      const pos = axis === "x" ? ball.x : ball.y;
      const depth = clamp01(1 - Math.abs(pos - center) / contactSpan);
      return easeInOut(depth);
    }

    function buildPath(m: number) {
      let d = "";
      for (let i = 0; i <= n; i++) {
        const t = ((i % n) / n) * Math.PI * 2;
        const pt = loopPoint(geo, t, m);
        d += i === 0 ? `M${pt.x.toFixed(2)} ${pt.y.toFixed(2)}` : `L${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      }
      return `${d}Z`;
    }

    function render(ball: { x: number; y: number }) {
      const m = morphFor(ball);
      const path = buildPath(m);
      shapeRef.current?.setAttribute("d", path);
      highlightRef.current?.setAttribute("d", path);
      shadowRef.current?.setAttribute("d", path);
      particleRef.current?.setAttribute("transform", `translate(${ball.x.toFixed(2)} ${ball.y.toFixed(2)})`);
    }

    function frame(now: number) {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      const p = (elapsed / cycle) % 1;
      render(ballAt(p));
      raf = window.requestAnimationFrame(frame);
    }

    if (reduce) {
      render({ x: geo.cx, y: geo.cy });
    } else {
      render(geo.fromDock);
      if (active) raf = window.requestAnimationFrame(frame);
    }
    return () => window.cancelAnimationFrame(raf);
  }, [geo, active]);

  return { shapeRef, highlightRef, shadowRef, particleRef };
}

function LoopScene({ geo, className, viewBox }: { geo: LoopGeometry; className: string; viewBox: string }) {
  const { shapeRef, highlightRef, shadowRef, particleRef } = useLoopSimulation(geo, true);
  const edge = geo.cx + geo.reach;

  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true">
      <path
        className="loop-connector loop-connector-left"
        d={`M${geo.cx - geo.reach - 62} ${geo.cy} L${geo.cx - geo.reach} ${geo.cy}`}
      />
      <path
        className="loop-connector loop-connector-right"
        d={`M${edge + 62} ${geo.cy} L${edge} ${geo.cy}`}
      />
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
