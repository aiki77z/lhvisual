// Static dependency-DAG backdrop with slow edge flow and node pulse.
// Decorative only; gated by prefers-reduced-motion in CSS.
const nodes = [
  { id: 0, x: 90, y: 120 },
  { id: 1, x: 250, y: 70 },
  { id: 2, x: 250, y: 190 },
  { id: 3, x: 430, y: 110 },
  { id: 4, x: 430, y: 240 },
  { id: 5, x: 620, y: 70 },
  { id: 6, x: 620, y: 190 },
  { id: 7, x: 800, y: 130 },
  { id: 8, x: 980, y: 90 },
  { id: 9, x: 980, y: 210 },
];

const edges = [
  [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 7], [7, 8], [7, 9],
];

export function HeroDag() {
  return (
    <svg
      className="hero-canvas"
      viewBox="0 0 1080 320"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
    >
      {edges.map(([a, b], i) => (
        <line
          key={`${a}-${b}`}
          className={i % 2 === 0 ? "edge flow" : "edge"}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={n.id}
          className={i % 3 === 0 ? "node pulse" : "node"}
          cx={n.x}
          cy={n.y}
          r={6.5}
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}
