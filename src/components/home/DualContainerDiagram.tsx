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

// Geometry of the lemniscate the particle rides. Two lobes centered at cx +/- span.
type LoopGeometry = {
  cx: number;
  cy: number;
  span: number; // horizontal distance from center to each lobe center
  lobe: number; // lobe radius
  points: number; // samples per closed path
  amp: number; // max outward deformation in px
};

const desktopGeo: LoopGeometry = { cx: 500, cy: 230, span: 90, lobe: 90, points: 120, amp: 26 };
const mobileGeo: LoopGeometry = { cx: 180, cy: 350, span: 55, lobe: 55, points: 120, amp: 18 };

// Parametric lemniscate of Gerono-like figure eight, t in [0, 2pi).
// Returns the rest position and outward normal for a given parameter.
function loopPoint(geo: LoopGeometry, t: number) {
  const s = Math.sin(t);
  const c = Math.cos(t);
  // Base figure-eight: x sweeps two lobes, y crosses zero at the waist.
  const x = geo.cx + (geo.span + geo.lobe) * s;
  const y = geo.cy + geo.lobe * s * c;
  // Outward normal via derivative.
  const dx = (geo.span + geo.lobe) * c;
  const dy = geo.lobe * (c * c - s * s);
  const len = Math.hypot(dx, dy) || 1;
  // Normal points away from the horizontal axis for a pleasing bulge.
  const nx = -dy / len;
  const ny = dx / len;
  const sign = y >= geo.cy ? 1 : -1;
  return { x, y, nx: nx * sign, ny: ny * sign };
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

// One deformable loop: samples the lemniscate, springs each sample outward as the
// particle passes, and rebuilds a smooth closed path each frame.
function useLoopSimulation(geo: LoopGeometry, active: boolean) {
  const shapeRef = useRef<SVGPathElement | null>(null);
  const highlightRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGPathElement | null>(null);
  const particleRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const n = geo.points;
    const disp = new Float32Array(n); // current outward displacement per sample
    const vel = new Float32Array(n); // spring velocity per sample
    const stiffness = 210;
    const damping = 14;

    let raf = 0;
    let last = 0;
    let phase = 0; // particle parameter in [0, 2pi)
    const period = 7.2; // seconds per full figure-eight

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function buildPath() {
      let d = "";
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const t = (idx / n) * Math.PI * 2;
        const p = loopPoint(geo, t);
        const off = disp[idx];
        const x = p.x + p.nx * off;
        const y = p.y + p.ny * off;
        d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : `L${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      return `${d}Z`;
    }

    function frame(now: number) {
      if (!last) last = now;
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;

      phase = (phase + (dt / period) * Math.PI * 2) % (Math.PI * 2);
      const head = loopPoint(geo, phase);

      // Strike: push samples near the particle outward, weighted by a narrow kernel.
      const strikeReach = Math.round(n * 0.08);
      const headIdx = Math.round((phase / (Math.PI * 2)) * n) % n;
      for (let k = -strikeReach; k <= strikeReach; k++) {
        const idx = (headIdx + k + n) % n;
        const falloff = Math.exp(-(k * k) / (strikeReach * 0.62) ** 2);
        vel[idx] += geo.amp * falloff * dt * 46;
      }

      // Spring relaxation back to the rest shape (the rebound).
      for (let i = 0; i < n; i++) {
        const accel = -stiffness * disp[i] - damping * vel[i];
        vel[i] += accel * dt;
        disp[i] += vel[i] * dt;
        const cap = geo.amp * 1.35;
        if (disp[i] > cap) disp[i] = cap;
        else if (disp[i] < -cap) disp[i] = -cap;
      }

      const path = buildPath();
      shapeRef.current?.setAttribute("d", path);
      highlightRef.current?.setAttribute("d", path);
      shadowRef.current?.setAttribute("d", path);
      if (particleRef.current) {
        particleRef.current.setAttribute("transform", `translate(${head.x.toFixed(2)} ${head.y.toFixed(2)})`);
      }

      raf = window.requestAnimationFrame(frame);
    }

    // Always render the rest shape once so SSR/static markup has something.
    const rest = buildPath();
    shapeRef.current?.setAttribute("d", rest);
    highlightRef.current?.setAttribute("d", rest);
    shadowRef.current?.setAttribute("d", rest);
    const restHead = loopPoint(geo, 0);
    particleRef.current?.setAttribute("transform", `translate(${restHead.x} ${restHead.y})`);

    if (!reduce && active) {
      raf = window.requestAnimationFrame(frame);
    }
    return () => window.cancelAnimationFrame(raf);
  }, [geo, active]);

  return { shapeRef, highlightRef, shadowRef, particleRef };
}

function LoopScene({ geo, className, viewBox }: { geo: LoopGeometry; className: string; viewBox: string }) {
  const { shapeRef, highlightRef, shadowRef, particleRef } = useLoopSimulation(geo, true);

  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true">
      <path
        className="loop-connector loop-connector-left"
        d={`M${geo.cx - geo.span - geo.lobe - 62} ${geo.cy} L${geo.cx - geo.span - geo.lobe} ${geo.cy}`}
      />
      <path
        className="loop-connector loop-connector-right"
        d={`M${geo.cx + geo.span + geo.lobe + 62} ${geo.cy} L${geo.cx + geo.span + geo.lobe} ${geo.cy}`}
      />
      <path ref={shadowRef} className="loop-core-shadow" />
      <path ref={shapeRef} className="loop-core-shape" />
      <path ref={highlightRef} className="loop-core-highlight" />
      <g ref={particleRef} className="loop-particle">
        <circle className="loop-particle-glow" r={geo.amp * 0.72} />
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
