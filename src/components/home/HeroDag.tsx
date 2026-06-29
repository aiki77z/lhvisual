import { useEffect, useRef } from "react";

// Canvas backdrop: PR particles drift in from the left and assemble a
// dependency DAG layer by layer (left to right), straight edges snapping into
// place as each layer lands. Once built, a topological pass sweeps the nodes
// (build, then a brighter test pulse), then the graph dissolves and the cycle
// repeats. Represents constructing tasks and running their tests. Decorative.

type Node = {
  layer: number;
  idxInLayer: number;
  tx: number; // target x (0..1)
  ty: number; // target y (0..1)
  sx: number; // scatter origin x (px, off-screen left)
  sy: number; // scatter origin y (px)
  order: number; // topological index
  r: number;
  jitter: number;
};

type Edge = { a: number; b: number };

const LAYERS = [2, 3, 4, 3, 4, 2];

function buildGraph() {
  const nodes: Node[] = [];
  const layerStart: number[] = [];
  LAYERS.forEach((count, li) => {
    layerStart[li] = nodes.length;
    for (let i = 0; i < count; i++) {
      nodes.push({
        layer: li,
        idxInLayer: i,
        tx: (li + 1) / (LAYERS.length + 1),
        ty: (i + 1) / (count + 1),
        sx: 0,
        sy: 0,
        order: 0,
        r: 3 + (i % 2) * 0.9,
        jitter: 0,
      });
    }
  });
  const edges: Edge[] = [];
  for (let li = 0; li < LAYERS.length - 1; li++) {
    const aFrom = layerStart[li];
    const aTo = layerStart[li] + LAYERS[li];
    const bFrom = layerStart[li + 1];
    const bTo = layerStart[li + 1] + LAYERS[li + 1];
    for (let a = aFrom; a < aTo; a++) {
      const k = 1 + ((a + li) % 2);
      for (let j = 0; j < k; j++) {
        const b = bFrom + ((a + j) % (bTo - bFrom));
        if (!edges.some((e) => e.a === a && e.b === b)) edges.push({ a, b });
      }
    }
  }
  nodes.forEach((n, i) => (n.order = i));
  return { nodes, edges, layerStart };
}

const SLATE = [120, 138, 170];
const AZURE = [77, 141, 255];
const TESTC = [120, 196, 255];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function HeroDag() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = ref.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const { nodes, edges } = buildGraph();
    let W = 0;
    let H = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const dust = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.3 + Math.random() * 0.7,
      seed: i,
    }));

    function assignOrigins() {
      nodes.forEach((n) => {
        // all enter from the left, vertically near their target, staggered depth
        n.sx = -60 - Math.random() * 260 - n.layer * 30;
        n.sy = n.ty * H + (Math.random() - 0.5) * H * 0.25;
        n.jitter = (Math.random() - 0.5) * 6;
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      assignOrigins();
    }
    resize();
    window.addEventListener("resize", resize);

    // Slower timeline (seconds). Assemble dominates so the build rhythm reads.
    const T = { assemble: 6.0, build: 3.2, test: 2.6, hold: 1.2, disperse: 2.4 };
    const CYCLE = T.assemble + T.build + T.test + T.hold + T.disperse;
    const NL = LAYERS.length;
    let start = performance.now();
    let raf = 0;

    // per-node arrival progress during assemble: layers land left to right
    function arrival(n: Node, p: number) {
      // p in 0..1 over the whole assemble phase
      const span = 1 / (NL + 0.6); // each layer gets a window
      const layerStartT = (n.layer / NL) * (1 - span * 0.4);
      const local = clamp01((p - layerStartT) / span);
      return easeOut(local);
    }

    function frame(now: number) {
      const elapsed = ((now - start) / 1000) % CYCLE;
      let phase: "assemble" | "build" | "test" | "hold" | "disperse" =
        "assemble";
      let p = 0;
      if (elapsed < T.assemble) {
        phase = "assemble";
        p = elapsed / T.assemble;
      } else if (elapsed < T.assemble + T.build) {
        phase = "build";
        p = (elapsed - T.assemble) / T.build;
      } else if (elapsed < T.assemble + T.build + T.test) {
        phase = "test";
        p = (elapsed - T.assemble - T.build) / T.test;
      } else if (elapsed < T.assemble + T.build + T.test + T.hold) {
        phase = "hold";
        p = 1;
      } else {
        phase = "disperse";
        p = (elapsed - T.assemble - T.build - T.test - T.hold) / T.disperse;
      }

      ctx.clearRect(0, 0, W, H);

      // ambient dust
      const tsec = now / 1000;
      for (const d of dust) {
        const dx = (d.x + Math.sin(tsec * 0.06 + d.seed) * 0.02) * W;
        const dy = ((d.y + tsec * 0.01 * d.z) % 1) * H;
        ctx.globalAlpha = 0.09 * d.z;
        ctx.fillStyle = "rgb(130,150,185)";
        ctx.beginPath();
        ctx.arc(dx, dy, 0.8 * d.z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // node settle factor (0 = at left origin, 1 = on graph)
      const settle = nodes.map((n) => {
        if (phase === "assemble") return arrival(n, p);
        if (phase === "disperse") return 1 - easeInOut(p);
        return 1;
      });

      const pos = nodes.map((n, i) => ({
        x: lerp(n.sx, n.tx * W, settle[i]),
        y: lerp(n.sy, n.ty * H + n.jitter, settle[i]),
      }));

      // straight edges; appear only when both endpoints are mostly settled
      ctx.lineWidth = 1;
      for (const e of edges) {
        const sa = settle[e.a];
        const sb = settle[e.b];
        const ea = Math.min(sa, sb);
        const alpha = clamp01((ea - 0.6) / 0.4) * 0.55;
        if (alpha <= 0) continue;
        const a = pos[e.a];
        const b = pos[e.b];
        const lit = phase === "build" || phase === "test" || phase === "hold";
        const c = lit ? AZURE : SLATE;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pp = pos[i];
        const s = settle[i];
        const frac = (n.order + 1) / nodes.length;

        let col = SLATE;
        let fresh = false;
        if (phase === "build") {
          const mix = clamp01((p - (frac - 0.04)) / 0.12);
          col = [
            lerp(SLATE[0], AZURE[0], mix),
            lerp(SLATE[1], AZURE[1], mix),
            lerp(SLATE[2], AZURE[2], mix),
          ];
          fresh = Math.abs(p - frac) < 0.06;
        } else if (phase === "test") {
          const mix = clamp01((p - (frac - 0.04)) / 0.1);
          const back = Math.max(0, mix - 0.5) * 2;
          col = [
            lerp(lerp(AZURE[0], TESTC[0], mix), AZURE[0], back),
            lerp(lerp(AZURE[1], TESTC[1], mix), AZURE[1], back),
            lerp(lerp(AZURE[2], TESTC[2], mix), AZURE[2], back),
          ];
          fresh = Math.abs(p - frac) < 0.05;
        } else if (phase === "hold") {
          col = AZURE;
        } else if (phase === "assemble") {
          // tint toward azure as it snaps in
          col = [
            lerp(SLATE[0], AZURE[0], s * 0.5),
            lerp(SLATE[1], AZURE[1], s * 0.5),
            lerp(SLATE[2], AZURE[2], s * 0.5),
          ];
          fresh = s > 0.82 && s < 0.999;
        }

        const alpha = 0.3 + 0.7 * s;
        if (fresh) {
          const grd = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 20);
          grd.addColorStop(0, `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},0.5)`);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, 20, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${alpha})`;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, n.r + (fresh ? 1.4 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${alpha * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, n.r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      start = performance.now() - (T.assemble + T.build + T.test);
      frame(performance.now());
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}
