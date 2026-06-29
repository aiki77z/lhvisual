import { useEffect, useRef } from "react";

// Canvas backdrop: PR particles scatter in, coalesce into a dependency DAG,
// sweep-color in topological order (build then test), then disperse and loop.
// Represents constructing tasks and running their tests. Decorative only.

type Node = {
  layer: number;
  tx: number; // target x (0..1 of width)
  ty: number; // target y (0..1 of height)
  px: number; // current x (px)
  py: number; // current y (px)
  sx: number; // scatter origin x (px)
  sy: number; // scatter origin y (px)
  order: number; // topological index
  r: number;
};

type Edge = { a: number; b: number };

function buildGraph() {
  // Layered DAG: nodes per layer, edges only forward.
  const layers = [2, 3, 4, 3, 4, 2];
  const nodes: Node[] = [];
  const layerStart: number[] = [];
  layers.forEach((count, li) => {
    layerStart[li] = nodes.length;
    for (let i = 0; i < count; i++) {
      const tx = (li + 1) / (layers.length + 1);
      const ty = (i + 1) / (count + 1);
      nodes.push({
        layer: li,
        tx,
        ty,
        px: 0,
        py: 0,
        sx: 0,
        sy: 0,
        order: 0,
        r: 3.2 + (i % 2) * 0.8,
      });
    }
  });
  const edges: Edge[] = [];
  for (let li = 0; li < layers.length - 1; li++) {
    const aFrom = layerStart[li];
    const aTo = layerStart[li] + layers[li];
    const bFrom = layerStart[li + 1];
    const bTo = layerStart[li + 1] + layers[li + 1];
    for (let a = aFrom; a < aTo; a++) {
      // each node connects to 1-2 nodes in next layer
      const k = 1 + ((a + li) % 2);
      for (let j = 0; j < k; j++) {
        const b = bFrom + ((a + j) % (bTo - bFrom));
        if (!edges.some((e) => e.a === a && e.b === b)) edges.push({ a, b });
      }
    }
  }
  // topological order = order of creation (already layered)
  nodes.forEach((n, i) => (n.order = i));
  return { nodes, edges };
}

const ACCENT = [61, 220, 151]; // green
const TEST = [89, 182, 255]; // blue
const IDLE = [120, 140, 158];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

    // floating dust particles for ambient depth
    const dust = Array.from({ length: 46 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.3 + Math.random() * 0.7,
      seed: i,
    }));

    function resize() {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // assign scatter origins (random, edge-biased) and seed positions
      nodes.forEach((n) => {
        const edge = Math.random();
        n.sx = edge < 0.5 ? -40 - Math.random() * 120 : W + 40 + Math.random() * 120;
        n.sy = Math.random() * H;
        n.px = n.tx * W;
        n.py = n.ty * H;
      });
    }
    resize();
    window.addEventListener("resize", resize);

    // Phase timeline (seconds): coalesce -> build sweep -> test sweep -> hold -> disperse
    const T = { coalesce: 2.6, build: 2.4, test: 2.0, hold: 0.8, disperse: 1.8 };
    const CYCLE = T.coalesce + T.build + T.test + T.hold + T.disperse;
    let start = performance.now();
    let raf = 0;

    function nodeColor(n: Node, phase: string, p: number) {
      // p is phase progress 0..1; returns [r,g,b,alpha]
      const N = nodes.length;
      const frac = (n.order + 1) / N;
      if (phase === "coalesce") return [...IDLE, 0.9] as number[];
      if (phase === "build") {
        const lit = p >= frac - 0.04;
        const mix = lit ? Math.min(1, (p - (frac - 0.04)) / 0.12) : 0;
        return [
          lerp(IDLE[0], ACCENT[0], mix),
          lerp(IDLE[1], ACCENT[1], mix),
          lerp(IDLE[2], ACCENT[2], mix),
          1,
        ];
      }
      if (phase === "test") {
        const hit = p >= frac - 0.04;
        const mix = hit ? Math.min(1, (p - (frac - 0.04)) / 0.1) : 0;
        // flash to blue then settle back toward green
        const back = Math.max(0, mix - 0.5) * 2;
        const cr = lerp(lerp(ACCENT[0], TEST[0], mix), ACCENT[0], back);
        const cg = lerp(lerp(ACCENT[1], TEST[1], mix), ACCENT[1], back);
        const cb = lerp(lerp(ACCENT[2], TEST[2], mix), ACCENT[2], back);
        return [cr, cg, cb, 1];
      }
      return [...ACCENT, 1] as number[];
    }

    function frame(now: number) {
      const elapsed = ((now - start) / 1000) % CYCLE;
      let phase = "coalesce";
      let p = 0;
      let settle = 1; // 0 scattered, 1 fully on-graph
      if (elapsed < T.coalesce) {
        phase = "coalesce";
        p = elapsed / T.coalesce;
        settle = easeInOut(p);
      } else if (elapsed < T.coalesce + T.build) {
        phase = "build";
        p = (elapsed - T.coalesce) / T.build;
        settle = 1;
      } else if (elapsed < T.coalesce + T.build + T.test) {
        phase = "test";
        p = (elapsed - T.coalesce - T.build) / T.test;
        settle = 1;
      } else if (elapsed < T.coalesce + T.build + T.test + T.hold) {
        phase = "hold";
        p = 1;
        settle = 1;
      } else {
        phase = "disperse";
        p = (elapsed - T.coalesce - T.build - T.test - T.hold) / T.disperse;
        settle = 1 - easeInOut(p);
      }

      ctx.clearRect(0, 0, W, H);

      // ambient dust
      const tsec = now / 1000;
      ctx.save();
      for (const d of dust) {
        const dx = (d.x + Math.sin(tsec * 0.08 + d.seed) * 0.02) * W;
        const dy =
          ((d.y + tsec * 0.012 * d.z) % 1) * H;
        ctx.globalAlpha = 0.10 * d.z;
        ctx.fillStyle = "rgb(150,170,185)";
        ctx.beginPath();
        ctx.arc(dx, dy, 0.8 * d.z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // node positions interpolate scatter <-> target
      const pos = nodes.map((n) => ({
        x: lerp(n.sx, n.tx * W, settle),
        y: lerp(n.sy, n.ty * H, settle),
      }));

      // edges (fade in with settle; flow dashes during build/test)
      ctx.lineWidth = 1;
      for (const e of edges) {
        const a = pos[e.a];
        const b = pos[e.b];
        const edgeAlpha = Math.max(0, (settle - 0.55) / 0.45) * 0.5;
        if (edgeAlpha <= 0) continue;
        const lit =
          (phase === "build" || phase === "test" || phase === "hold") &&
          true;
        ctx.strokeStyle = lit
          ? `rgba(61,220,151,${edgeAlpha})`
          : `rgba(110,130,150,${edgeAlpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        // gentle curve
        const mx = (a.x + b.x) / 2;
        ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
        ctx.stroke();
      }

      // nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pp = pos[i];
        const [r, g, bl, al] = nodeColor(n, phase, p);
        const alpha = al * (0.35 + 0.65 * settle);
        // glow for freshly-lit nodes
        const frac = (n.order + 1) / nodes.length;
        const fresh =
          (phase === "build" && Math.abs(p - frac) < 0.06) ||
          (phase === "test" && Math.abs(p - frac) < 0.05);
        if (fresh) {
          const grd = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 18);
          grd.addColorStop(0, `rgba(${r | 0},${g | 0},${bl | 0},0.5)`);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, 18, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${bl | 0},${alpha})`;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, n.r + (fresh ? 1.4 : 0), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, n.r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      // static settled graph, single paint
      start = performance.now() - (T.coalesce + T.build + T.test);
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
