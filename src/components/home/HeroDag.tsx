import { useEffect, useRef } from "react";

// Canvas backdrop with a molecular assembly feel. Every node AND every edge is
// an independent fragment: short line segments and points drift freely in the
// field, then converge and lock into a dependency DAG, the nodes are tested
// (flash) and pass (brighten), and finally each fragment detaches and floats
// away on its own again. Fragment timelines are staggered by topological order
// so assembly and dispersal read as a wave while the field stays alive.
// Decorative only.

type Node = {
  tx: number;
  ty: number;
  fx: number; // float home (0..1)
  fy: number;
  pa: number;
  pb: number;
  order: number;
  r: number;
  offset: number;
};

type Edge = {
  a: number;
  b: number;
  // float home for the detached segment
  fx: number;
  fy: number;
  ang: number;
  len: number; // 0..1 of min(W,H)
  drift: number;
  offset: number;
};

const LAYERS = [2, 3, 4, 3, 2];

function buildGraph() {
  const nodes: Node[] = [];
  const layerStart: number[] = [];
  LAYERS.forEach((count, li) => {
    layerStart[li] = nodes.length;
    for (let i = 0; i < count; i++) {
      nodes.push({
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
        if (!edges.some((e) => e.a === a && e.b === b)) {
          edges.push({ a, b, fx: 0, fy: 0, ang: 0, len: 0, drift: 0, offset: 0 });
        }
      }
    }
  }
  nodes.forEach((n, i) => (n.order = i));
  const N = nodes.length;
  nodes.forEach((n) => (n.offset = (n.order / N) * 0.5));
  // an edge locks slightly after its later endpoint settles
  edges.forEach((e) => {
    const base = Math.max(nodes[e.a].offset, nodes[e.b].offset);
    e.offset = base + 0.04;
  });
  return { nodes, edges };
}

const DIM = [96, 110, 140];
const LIT = [150, 165, 195];
const TEST = [120, 196, 255];
const PASS = [77, 141, 255];

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

// Node lifecycle over local time u (0..1).
function nodeLife(u: number) {
  if (u < 0.24) return { lock: 0, color: DIM, glow: 0, alpha: 0.5 };
  if (u < 0.45) {
    const t = smooth((u - 0.24) / 0.21);
    return { lock: t, color: mix3(DIM, LIT, t), glow: 0, alpha: lerp(0.5, 0.95, t) };
  }
  if (u < 0.6) return { lock: 1, color: LIT, glow: 0, alpha: 0.95 };
  if (u < 0.72) {
    const t = (u - 0.6) / 0.12;
    const flash = Math.sin(clamp01(t) * Math.PI);
    return { lock: 1, color: mix3(LIT, TEST, flash), glow: flash, alpha: 1 };
  }
  if (u < 0.82) {
    const t = smooth((u - 0.72) / 0.1);
    return { lock: 1, color: mix3(TEST, PASS, t), glow: 0.4 * (1 - t), alpha: 1 };
  }
  const t = smooth((u - 0.82) / 0.18);
  return { lock: 1 - t, color: mix3(PASS, DIM, t), glow: 0, alpha: lerp(0.95, 0.45, t) };
}

// Edge lifecycle over local time u (0..1): floats, locks to its endpoints,
// holds, then detaches and drifts away again.
function edgeLife(u: number) {
  if (u < 0.28) return { lock: 0, alpha: 0.16 };
  if (u < 0.46) {
    const t = smooth((u - 0.28) / 0.18);
    return { lock: t, alpha: lerp(0.16, 0.5, t) };
  }
  if (u < 0.8) return { lock: 1, alpha: 0.5 };
  const t = smooth((u - 0.8) / 0.2);
  return { lock: 1 - t, alpha: lerp(0.5, 0.16, t) };
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
        n.fx = n.tx * 0.82 + (Math.random() - 0.5) * 0.26;
        n.fy = clamp01(n.ty + (Math.random() - 0.5) * 0.45);
        n.pa = Math.random() * Math.PI * 2;
        n.pb = Math.random() * Math.PI * 2;
      });
      edges.forEach((e) => {
        // float home roughly between the two endpoints' float homes
        const na = nodes[e.a];
        const nb = nodes[e.b];
        e.fx = (na.fx + nb.fx) / 2 + (Math.random() - 0.5) * 0.16;
        e.fy = (na.fy + nb.fy) / 2 + (Math.random() - 0.5) * 0.16;
        e.ang = Math.random() * Math.PI;
        e.len = 0.05 + Math.random() * 0.05;
        e.drift = Math.random() * Math.PI * 2;
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

    const CYCLE = 16;
    let start = performance.now();
    let raf = 0;

    function nodePos(n: Node, tsec: number) {
      const u = (((tsec / CYCLE) + n.offset) % 1 + 1) % 1;
      const ls = nodeLife(u);
      const driftX = n.fx * W + Math.sin(tsec * 0.16 + n.pa) * 16;
      const driftY = n.fy * H + Math.cos(tsec * 0.13 + n.pb) * 13;
      return {
        x: lerp(driftX, n.tx * W, ls.lock),
        y: lerp(driftY, n.ty * H, ls.lock),
        lock: ls.lock,
        color: ls.color,
        glow: ls.glow,
        alpha: ls.alpha,
      };
    }

    function frame(now: number) {
      const tsec = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      const np = nodes.map((n) => nodePos(n, tsec));
      const minWH = Math.min(W, H);

      // edge fragments
      ctx.lineCap = "round";
      for (const e of edges) {
        const u = (((tsec / CYCLE) + e.offset) % 1 + 1) % 1;
        const el = edgeLife(u);
        const a = np[e.a];
        const b = np[e.b];
        // floating segment endpoints around the edge float home
        const cx = e.fx * W + Math.sin(tsec * 0.14 + e.drift) * 18;
        const cy = e.fy * H + Math.cos(tsec * 0.12 + e.drift) * 15;
        const half = (e.len * minWH) / 2;
        const ax = cx - Math.cos(e.ang) * half;
        const ay = cy - Math.sin(e.ang) * half;
        const bx = cx + Math.cos(e.ang) * half;
        const by = cy + Math.sin(e.ang) * half;
        // interpolate floating segment -> locked to node positions
        const x1 = lerp(ax, a.x, el.lock);
        const y1 = lerp(ay, a.y, el.lock);
        const x2 = lerp(bx, b.x, el.lock);
        const y2 = lerp(by, b.y, el.lock);
        const passed = a.color[2] > 180 || b.color[2] > 180;
        const c = passed && el.lock > 0.7 ? PASS : [92, 106, 136];
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${el.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // node fragments
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const s = np[i];
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
        const ring = clamp01((s.lock - 0.5) / 0.5) * s.alpha * 0.5;
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
