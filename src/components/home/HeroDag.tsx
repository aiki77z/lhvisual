import { useEffect, useRef } from "react";

// Canvas backdrop with a molecular assembly feel. Nodes and edges are
// independent fragments that float freely, then lock into a dependency DAG one
// element at a time following a topological build order (so an edge never
// appears before its endpoints), with the order within each topological layer
// shuffled so the assembly looks organic rather than rigidly row by row. Once a
// node is built it is tested (flash) and passes (brighten). On dispersal a
// fragment fades and lightens in place without changing shape, then drifts off
// as a free particle before the next build. Decorative only.

type Node = {
  id: number;
  layer: number;
  tx: number;
  ty: number;
  fx: number; // float home (0..1)
  fy: number;
  pa: number;
  pb: number;
  r: number;
  seq: number; // position in the build sequence (0..1)
};

type Edge = {
  a: number;
  b: number;
  fx: number; // float home of the detached segment center
  fy: number;
  ang: number;
  len: number;
  drift: number;
  seq: number;
};

const LAYERS = [2, 3, 4, 3, 2];

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildGraph() {
  const nodes: Node[] = [];
  const layerStart: number[] = [];
  const layerOf: number[] = [];
  LAYERS.forEach((count, li) => {
    layerStart[li] = nodes.length;
    for (let i = 0; i < count; i++) {
      const id = nodes.length;
      layerOf[id] = li;
      nodes.push({
        id,
        layer: li,
        tx: (li + 1) / (LAYERS.length + 1),
        ty: (i + 1) / (count + 1),
        fx: 0,
        fy: 0,
        pa: 0,
        pb: 0,
        r: 2.8 + (i % 2) * 0.8,
        seq: 0,
      });
    }
  });

  const edges: Edge[] = [];
  const outEdges: number[][] = nodes.map(() => []);
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
          const idx = edges.length;
          edges.push({ a, b, fx: 0, fy: 0, ang: 0, len: 0, drift: 0, seq: 0 });
          outEdges[a].push(idx);
        }
      }
    }
  }

  // Build a topological emission order: layer by layer, nodes within a layer
  // shuffled; after each node emit its outgoing edges (shuffled). This keeps
  // the DAG generation valid (an edge follows its source node) while looking
  // disordered within a layer.
  const order: Array<{ kind: "node" | "edge"; index: number }> = [];
  for (let li = 0; li < LAYERS.length; li++) {
    const ids = shuffle(
      nodes.filter((n) => n.layer === li).map((n) => n.id),
    );
    for (const id of ids) {
      order.push({ kind: "node", index: id });
      for (const ei of shuffle([...outEdges[id]])) {
        order.push({ kind: "edge", index: ei });
      }
    }
  }
  const total = order.length;
  order.forEach((item, i) => {
    const s = i / total;
    if (item.kind === "node") nodes[item.index].seq = s;
    else edges[item.index].seq = s;
  });

  return { nodes, edges };
}

const DIM = [96, 110, 140];
const LIT = [150, 165, 195];
const TEST = [120, 196, 255];
const PASS = [77, 141, 255];
const FADE = [70, 80, 104]; // lighter/cooler tone elements fade toward

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

// Fraction of the cycle spent sweeping the build front across the sequence.
// Each element converges over a short window once the front reaches its seq.
const BUILD_SPAN = 0.5; // 0..1 of cycle for the assembly sweep
const CONVERGE = 0.12; // per-element converge duration (in cycle units)

// Returns the element's lifecycle given the global cycle phase g (0..1) and the
// element's sequence position seq (0..1).
// Timeline: float -> converge (when front reaches seq) -> locked window
//           (node tests/passes) -> dissolve in place -> float again.
function elementState(g: number, seq: number, isNode: boolean) {
  // build front position in cycle units; element converges in [t0, t0+CONVERGE]
  const t0 = seq * BUILD_SPAN;
  const tLockStart = t0 + CONVERGE;
  const dissolveStart = 0.84;
  const dissolveEnd = 0.96;

  let lock: number; // 0 float pos, 1 target pos
  let phase: "float" | "converge" | "locked" | "dissolve";

  if (g < t0) {
    lock = 0;
    phase = "float";
  } else if (g < tLockStart) {
    lock = smooth((g - t0) / CONVERGE);
    phase = "converge";
  } else if (g < dissolveStart) {
    lock = 1;
    phase = "locked";
  } else if (g < dissolveEnd) {
    lock = 1; // hold shape; only fade
    phase = "dissolve";
  } else {
    lock = 0;
    phase = "float";
  }

  // color + alpha
  let color = DIM;
  let glow = 0;
  let alpha = 0.16;

  if (phase === "float") {
    color = isNode ? DIM : FADE;
    alpha = isNode ? 0.5 : 0.16;
  } else if (phase === "converge") {
    const t = lock;
    color = mix3(isNode ? DIM : FADE, isNode ? LIT : [92, 106, 136], t);
    alpha = lerp(isNode ? 0.5 : 0.16, isNode ? 0.95 : 0.5, t);
  } else if (phase === "locked") {
    if (isNode) {
      // local time inside the locked window for test/pass
      const w = (g - tLockStart) / (dissolveStart - tLockStart); // 0..1
      if (w < 0.45) {
        color = LIT;
        alpha = 0.95;
      } else if (w < 0.62) {
        const f = Math.sin(clamp01((w - 0.45) / 0.17) * Math.PI);
        color = mix3(LIT, TEST, f);
        glow = f;
        alpha = 1;
      } else {
        const t = smooth((w - 0.62) / 0.38);
        color = mix3(TEST, PASS, t);
        glow = 0.35 * (1 - t);
        alpha = 1;
      }
    } else {
      color = [92, 106, 136];
      alpha = 0.5;
    }
  } else {
    // dissolve: fade + lighten in place, no shape change
    const t = smooth((g - dissolveStart) / (dissolveEnd - dissolveStart));
    const from = isNode ? PASS : [92, 106, 136];
    color = mix3(from, FADE, t);
    alpha = lerp(isNode ? 0.95 : 0.5, isNode ? 0.16 : 0.08, t);
  }

  return { lock, color, glow, alpha };
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
        const na = nodes[e.a];
        const nb = nodes[e.b];
        e.fx = (na.fx + nb.fx) / 2 + (Math.random() - 0.5) * 0.18;
        e.fy = (na.fy + nb.fy) / 2 + (Math.random() - 0.5) * 0.18;
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

    const CYCLE = 18;
    let start = performance.now();
    let raf = 0;

    function nodePos(n: Node, tsec: number) {
      const g = ((tsec / CYCLE) % 1 + 1) % 1;
      const st = elementState(g, n.seq, true);
      const driftX = n.fx * W + Math.sin(tsec * 0.16 + n.pa) * 16;
      const driftY = n.fy * H + Math.cos(tsec * 0.13 + n.pb) * 13;
      return {
        x: lerp(driftX, n.tx * W, st.lock),
        y: lerp(driftY, n.ty * H, st.lock),
        ...st,
      };
    }

    function frame(now: number) {
      const tsec = (now - start) / 1000;
      const g = ((tsec / CYCLE) % 1 + 1) % 1;
      ctx.clearRect(0, 0, W, H);

      const np = nodes.map((n) => nodePos(n, tsec));
      const minWH = Math.min(W, H);

      // edge fragments
      ctx.lineCap = "round";
      for (const e of edges) {
        const st = elementState(g, e.seq, false);
        const a = np[e.a];
        const b = np[e.b];
        const cx = e.fx * W + Math.sin(tsec * 0.14 + e.drift) * 18;
        const cy = e.fy * H + Math.cos(tsec * 0.12 + e.drift) * 15;
        const half = (e.len * minWH) / 2;
        const ax = cx - Math.cos(e.ang) * half;
        const ay = cy - Math.sin(e.ang) * half;
        const bx = cx + Math.cos(e.ang) * half;
        const by = cy + Math.sin(e.ang) * half;
        const x1 = lerp(ax, a.x, st.lock);
        const y1 = lerp(ay, a.y, st.lock);
        const x2 = lerp(bx, b.x, st.lock);
        const y2 = lerp(by, b.y, st.lock);
        // brighten edge once both endpoints have passed
        const passed = a.color[2] > 180 && b.color[2] > 180;
        const [r, gg, bl] = passed && st.lock > 0.7 ? PASS : st.color;
        ctx.strokeStyle = `rgba(${r | 0},${gg | 0},${bl | 0},${st.alpha})`;
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
        const [r, g2, bl] = s.color;
        if (s.glow > 0.01) {
          const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
          gr.addColorStop(0, `rgba(${r | 0},${g2 | 0},${bl | 0},${0.5 * s.glow})`);
          gr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${r | 0},${g2 | 0},${bl | 0},${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, n.r + s.glow * 1.4, 0, Math.PI * 2);
        ctx.fill();
        const ring = clamp01((s.lock - 0.5) / 0.5) * s.alpha * 0.5;
        if (ring > 0.02) {
          ctx.strokeStyle = `rgba(${r | 0},${g2 | 0},${bl | 0},${ring})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(s.x, s.y, n.r + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(frame);
    }

    if (reduce) {
      start = performance.now() - CYCLE * 0.6;
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
