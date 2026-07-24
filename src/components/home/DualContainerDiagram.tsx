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
};

const desktopGeo: LoopGeometry = { cx: 500, cy: 230, radius: 96, reach: 182, height: 92, points: 160 };
const mobileGeo: LoopGeometry = { cx: 180, cy: 350, radius: 62, reach: 118, height: 60, points: 160 };

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

// The whole curve morphs as a system: a ball rides the loop, and each time it
// sweeps through the right side it drives a spring `morph` that twists the
// entire shape between circle and infinity, then rebounds. Nothing is a local
// dent; the impact reshapes the full line.
function useLoopSimulation(geo: LoopGeometry, active: boolean) {
  const shapeRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGPathElement | null>(null);
  const particleRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const n = geo.points;
    let raf = 0;
    let last = 0;

    // Whole-curve morph as a driven spring. rest target eases between circle and
    // infinity; the ball's strike kicks velocity so the shape twists and rebounds.
    let morph = 0;
    let morphVel = 0;
    const stiffness = 26;
    const damping = 3.2;

    let phase = 0; // ball parameter along the curve, [0, 2pi)
    const period = 4.6; // seconds per lap
    let struckThisLap = false;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function buildPath(m: number) {
      let d = "";
      for (let i = 0; i <= n; i++) {
        const t = ((i % n) / n) * Math.PI * 2;
        const p = loopPoint(geo, t, m);
        d += i === 0 ? `M${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      }
      return `${d}Z`;
    }

    function render(m: number, ballT: number) {
      const path = buildPath(m);
      shapeRef.current?.setAttribute("d", path);
      highlightRef.current?.setAttribute("d", path);
      shadowRef.current?.setAttribute("d", path);
      const b = loopPoint(geo, ballT, m);
      particleRef.current?.setAttribute("transform", `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)})`);
    }

    function frame(now: number) {
      if (!last) last = now;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;

      // Ball speeds up as it is flung outward (near the lobes) and eases at the waist.
      const prevPhase = phase;
      const speed = 1 + 0.85 * Math.abs(Math.sin(phase));
      phase = (phase + (dt / period) * Math.PI * 2 * speed) % (Math.PI * 2);

      // Strike once per lap as the ball crosses the right extreme (t = pi/2).
      const target = Math.PI / 2;
      if (prevPhase < target && phase >= target && !struckThisLap) {
        morphVel += 9.5; // impact energy twisting the curve toward infinity
        struckThisLap = true;
      }
      if (phase < target) struckThisLap = false;

      // Whole-curve spring: pulled toward the infinity form, rebounding past it.
      const restTarget = 0.72;
      const accel = -stiffness * (morph - restTarget) - damping * morphVel;
      morphVel += accel * dt;
      morph += morphVel * dt;
      if (morph < 0) {
        morph = 0;
        morphVel *= -0.4;
      } else if (morph > 1.25) {
        morph = 1.25;
        morphVel *= -0.4;
      }

      render(morph, phase);
      raf = window.requestAnimationFrame(frame);
    }

    render(reduce ? 1 : 0, reduce ? Math.PI / 2 : 0);
    if (!reduce && active) {
      raf = window.requestAnimationFrame(frame);
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
