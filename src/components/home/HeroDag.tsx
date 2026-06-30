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
  // continuous float drift centered on the target (no distant home -> no jump)
  ax: number; // x amplitude (fraction of W)
  ay: number; // y amplitude (fraction of H)
  f1: number;
  f2: number;
  pa: number;
  pb: number;
  r: number;
  pOff: number; // independent lifecycle phase offset (0..1)
};

type Edge = {
  a: number;
  b: number;
  ang: number;
  len: number;
  pOff: number; // independent lifecycle phase offset (0..1)
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
        // compress vertical spread into a centered band so inter-layer edges
        // run flatter and the graph reads more cleanly
        ty: 0.2 + ((i + 1) / (count + 1)) * 0.6,
        ax: 0,
        ay: 0,
        f1: 0,
        f2: 0,
        pa: 0,
        pb: 0,
        r: 2.8 + (i % 2) * 0.8,
        pOff: 0,
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
          edges.push({ a, b, ang: 0, len: 0, pOff: 0 });
        }
      }
    }
  }

  // Each element runs its own independent lifecycle loop at a different phase
  // offset, so the field is always a mix of building, locked, and dissolving
  // fragments -- there is no global build-then-teardown beat and therefore no
  // visible loop seam. Nodes get offsets spread evenly (then jittered) so the
  // churn stays balanced; each edge is offset just after its source node so the
  // local "node appears, then its edge" relationship still reads.
  const nodeIds = shuffle(nodes.map((n) => n.id));
  nodeIds.forEach((id, i) => {
    nodes[id].pOff = (i / nodeIds.length + (Math.random() - 0.5) * 0.04 + 1) % 1;
  });
  edges.forEach((e) => {
    e.pOff = (nodes[e.a].pOff + 0.05 + Math.random() * 0.03) % 1;
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

// Per-element lifecycle as fractions of that element's own local cycle. It
// rests in "float" at both ends (u=0 and u=1) so each loop wraps seamlessly,
// and spends a good share of the cycle floating so that, with phase offsets
// spread across all elements, the field is always a mix of states.
const T_CONVERGE_IN = 0.1; // float -> converge starts
const T_LOCKED = 0.26; // fully locked from here
const T_DISSOLVE = 0.56; // start fading in place
const T_DETACH = 0.64; // start easing off the spot
const T_FLOAT = 0.8; // fully floating again from here

// u is the element's local phase (0..1). lock is 0 floating, 1 locked; it only
// changes smoothly, so an element never teleports and the loop has no seam.
function elementState(u: number, isNode: boolean) {
  let lock: number;
  let phase: "float" | "converge" | "locked" | "dissolve" | "detach";

  if (u < T_CONVERGE_IN) {
    lock = 0;
    phase = "float";
  } else if (u < T_LOCKED) {
    lock = smooth((u - T_CONVERGE_IN) / (T_LOCKED - T_CONVERGE_IN));
    phase = "converge";
  } else if (u < T_DISSOLVE) {
    lock = 1;
    phase = "locked";
  } else if (u < T_DETACH) {
    lock = 1; // hold shape; fade in place
    phase = "dissolve";
  } else if (u < T_FLOAT) {
    lock = 1 - smooth((u - T_DETACH) / (T_FLOAT - T_DETACH)); // ease off the spot
    phase = "detach";
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
      const w = (u - T_LOCKED) / (T_DISSOLVE - T_LOCKED); // 0..1 within locked
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
  } else if (phase === "dissolve") {
    const t = smooth((u - T_DISSOLVE) / (T_DETACH - T_DISSOLVE));
    const from = isNode ? PASS : [92, 106, 136];
    color = mix3(from, FADE, t);
    alpha = lerp(isNode ? 0.95 : 0.5, isNode ? 0.4 : 0.18, t);
  } else {
    // detach: already faded; drift off toward the float state
    const t = smooth((u - T_DETACH) / (T_FLOAT - T_DETACH));
    color = FADE;
    alpha = lerp(isNode ? 0.4 : 0.18, isNode ? 0.5 : 0.16, t);
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
        // drift amplitude varies per node so the floating field looks scattered
        n.ax = 0.06 + Math.random() * 0.08;
        n.ay = 0.08 + Math.random() * 0.1;
        n.f1 = 0.08 + Math.random() * 0.06;
        n.f2 = 0.05 + Math.random() * 0.05;
        n.pa = Math.random() * Math.PI * 2;
        n.pb = Math.random() * Math.PI * 2;
      });
      edges.forEach((e) => {
        // keep floating segments shallow (near horizontal, +/- ~32deg)
        e.ang = (Math.random() - 0.5) * 1.12;
        e.len = 0.05 + Math.random() * 0.05;
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
      const st = elementState((g + n.pOff) % 1, true);
      // continuous wander centered on the target; contribution scales with
      // (1 - lock) so the point sits exactly on target when locked and drifts
      // smoothly off the same spot when released -> never teleports
      const wx =
        (Math.sin(tsec * n.f1 + n.pa) + 0.4 * Math.sin(tsec * n.f2 * 1.7 + n.pb)) *
        n.ax *
        W;
      const wy =
        (Math.cos(tsec * n.f2 + n.pb) + 0.4 * Math.sin(tsec * n.f1 * 1.3 + n.pa)) *
        n.ay *
        H;
      const free = 1 - st.lock;
      return {
        x: n.tx * W + wx * free,
        y: n.ty * H + wy * free,
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
        const st = elementState((g + e.pOff) % 1, false);
        const a = np[e.a];
        const b = np[e.b];
        // floating segment rides near the midpoint of its (already drifting)
        // endpoints, so it detaches and floats continuously with no jump
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
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
