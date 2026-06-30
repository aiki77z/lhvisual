import { useEffect, useRef } from "react";

// Canvas backdrop with a per-node lifecycle. Dots and connecting lines first
// drift freely, then converge point by point into a dependency DAG; each node
// is then tested (a brief flash), passes (bright), and disperses back into
// drifting points. Node timelines are staggered by topological order so the
// build, test, and dispersal read as a left-to-right wave while the field
// always stays alive. Decorative only.

type Node = {
  layer: number;
  tx: number;
  ty: number;
  fx: number; // float home x (0..1)
  fy: number; // float home y (0..1)
  pa: number; // drift phase a
  pb: number; // drift phase b
  order: number;
  r: number;
  offset: number; // lifecycle start offset (0..1)
};

type Edge = { a: number; b: number };

const LAYERS = [2, 3, 4, 3, 2];

function buildGraph() {
  const nodes: Node[] = [];
  const layerStart: number[] = [];
  LAYERS.forEach((count, li) => {
    layerStart[li] = nodes.length;
    for (let i = 0; i < count; i++) {
      nodes.push({
        layer: li,
        tx: (li + 1) / (LAYERS.length + 1),
        ty: (i + 1) / (count + 1),
        fx: 0,
        fy: 0,
        pa: 0,
        pb: 0,
        order: 0,
        r: 2.8 + (i % 2) * 0.8,
        offset: 0,
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
  // stagger lifecycle by topological order so build sweeps left to right
  const N = nodes.length;
  nodes.forEach((n) => (n.offset = (n.order / N) * 0.5));
  return { nodes, edges };
}

const DIM = [96, 110, 140]; // drifting / idle
const LIT = [150, 165, 195]; // settled, structure visible
const TEST = [120, 196, 255]; // test flash
const PASS = [77, 141, 255]; // passed

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp01(t: number) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function smooth(t: number) {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
}
function mix3(a: number[], b: number[], t: number) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// Lifecycle stages within a node's local time u (0..1):
//   float    [0.00,0.22)  drifting points + loose lines
//   converge [0.22,0.45)  move from float home to graph target
//   settle   [0.45,0.60)  hold on graph, structure lit
//   test     [0.60,0.72)  flash
//   pass     [0.72,0.84)  bright, confirmed
//   disperse [0.84,1.00)  drift back out to float home
function lifecycle(u: number) {
  // returns { onGraph: 0..1 (0 float, 1 target), color:[r,g,b], glow:0..1, alpha:0..1 }
  if (u < 0.22) {
    return { onGraph: 0, color: DIM, glow: 0, alpha: 0.5 };
  }
  if (u < 0.45) {
    const t = smooth((u - 0.22) / 0.23);
    return { onGraph: t, color: mix3(DIM, LIT, t), glow: 0, alpha: lerp(0.5, 0.95, t) };
  }
  if (u < 0.6) {
    return { onGraph: 1, color: LIT, glow: 0, alpha: 0.95 };
  }
  if (u < 0.72) {
    const t = (u - 0.6) / 0.12;
    const flash = Math.sin(clamp01(t) * Math.PI);
    return { onGraph: 1, color: mix3(LIT, TEST, flash), glow: flash, alpha: 1 };
  }
  if (u < 0.84) {
    const t = smooth((u - 0.72) / 0.12);
    return { onGraph: 1, color: mix3(TEST, PASS, t), glow: 0.4 * (1 - t), alpha: 1 };
  }
  const t = smooth((u - 0.84) / 0.16);
  return { onGraph: 1 - t, color: mix3(PASS, DIM, t), glow: 0, alpha: lerp(0.95, 0.5, t) };
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

    function assignFloat() {
      nodes.forEach((n) => {
        // float home: loosely near target but offset, biased left
        n.fx = n.tx * 0.85 + (Math.random() - 0.5) * 0.22;
        n.fy = clamp01(n.ty + (Math.random() - 0.5) * 0.4);
        n.pa = Math.random() * Math.PI * 2;
        n.pb = Math.random() * Math.PI * 2;
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
      assignFloat();
    }
    resize();
    window.addEventListener("resize", resize);

    const CYCLE = 14; // seconds for one full node lifecycle
    let start = performance.now();
    let raf = 0;

    function nodeState(n: Node, tsec: number) {
      const u = (((tsec / CYCLE) + n.offset) % 1 + 1) % 1;
      const ls = lifecycle(u);
      // float drift position (gentle)
      const driftX = n.fx * W + Math.sin(tsec * 0.18 + n.pa) * 14;
      const driftY = n.fy * H + Math.cos(tsec * 0.15 + n.pb) * 12;
      const tgtX = n.tx * W;
      const tgtY = n.ty * H;
      return {
        x: lerp(driftX, tgtX, ls.onGraph),
        y: lerp(driftY, tgtY, ls.onGraph),
        onGraph: ls.onGraph,
        color: ls.color,
        glow: ls.glow,
        alpha: ls.alpha,
      };
    }

    function frame(now: number) {
      const tsec = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      const st = nodes.map((n) => nodeState(n, tsec));

      // edges: present when both endpoints are on-graph; loose faint lines while drifting
      for (const e of edges) {
        const a = st[e.a];
        const b = st[e.b];
        const onBoth = Math.min(a.onGraph, b.onGraph);
        // structural line alpha grows with settledness
        const structural = clamp01((onBoth - 0.55) / 0.45);
        // faint "loose" line while points float near each other
        const loose = (1 - onBoth) * 0.12;
        const alpha = structural * 0.5 + loose;
        if (alpha <= 0.02) continue;
        // color follows the brighter (passed) endpoint a touch
        const passed = Math.max(
          a.color[2] > 180 ? 1 : 0,
          b.color[2] > 180 ? 1 : 0,
        );
        const c = passed ? PASS : [90, 104, 134];
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const s = st[i];
        const [r, g, bl] = s.color;
        if (s.glow > 0.01) {
          const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
          gr.addColorStop(0, `rgba(${r | 0},${g | 0},${bl | 0},${0.5 * s.glow})`);
          gr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${r | 0},${g | 0},${bl | 0},${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, n.r + s.glow * 1.4, 0, Math.PI * 2);
        ctx.fill();
        // thin ring only once settled
        const ring = clamp01((s.onGraph - 0.5) / 0.5) * s.alpha * 0.5;
        if (ring > 0.02) {
          ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${ring})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(s.x, s.y, n.r + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      // freeze at a mostly-settled moment
      start = performance.now() - CYCLE * 0.52;
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
