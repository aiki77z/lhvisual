import { caseDagEdges, caseDagNodes, type CaseDagNode } from "../../data/caseReplay";

const layerLabels = ["Ready frontier", "Math core", "Game systems", "Acceptance"];
const layerX = [70, 390, 710, 1030] as const;
const nodeWidth = 260;
const nodeHeight = 76;
const nodeGap = 24;

const nodeOrder = [
  "point_fix",
  "rectangle_math",
  "replay_io",
  "mathhelper",
  "vector3_math",
  "matrix_math",
  "color_math",
  "vector2_math",
  "scoring_system",
  "transform_system",
  "sim_world",
  "replay_runner",
] as const;

const yOffsetsByLayer: Record<number, number> = {
  0: 66,
  1: 66,
  2: 94,
  3: 94,
};

function statusLabel(status: CaseDagNode["status"]) {
  if (status === "done") return "passed";
  if (status === "running") return "agent";
  if (status === "testing") return "tests";
  return status;
}

export function CaseDag() {
  const orderedNodes = nodeOrder
    .map((id) => caseDagNodes.find((node) => node.id === id))
    .filter((node): node is CaseDagNode => Boolean(node));

  const nodePositions = Object.fromEntries(
    orderedNodes.map((node) => {
      const layerNodes = orderedNodes.filter((candidate) => candidate.layer === node.layer);
      const layerIndex = layerNodes.findIndex((candidate) => candidate.id === node.id);

      return [
        node.id,
        {
          x: layerX[node.layer],
          y: yOffsetsByLayer[node.layer] + layerIndex * (nodeHeight + nodeGap),
        },
      ];
    }),
  );

  return (
    <div className="case-dag" aria-label="MonoGame Math Arena dependency DAG">
      <svg className="case-dag-svg" viewBox="0 0 1360 510" role="img">
        <title>MonoGame Math Arena DAG</title>
        <desc>
          Dependency graph showing four layers from ready frontier modules through math core, game systems, and
          acceptance tests.
        </desc>
        {layerLabels.map((label, layer) => (
          <text className="case-dag-layer-title" key={label} x={layerX[layer]} y="26">
            {label}
          </text>
        ))}
        <g aria-hidden="true">
          {caseDagEdges.map((edge) => {
            const from = nodePositions[edge.from];
            const to = nodePositions[edge.to];
            const startX = from.x + nodeWidth;
            const startY = from.y + nodeHeight / 2;
            const endX = to.x;
            const endY = to.y + nodeHeight / 2;
            const midX = startX + (endX - startX) * 0.5;

            return (
              <path
                className="case-dag-edge"
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                key={`${edge.from}-${edge.to}`}
              />
            );
          })}
        </g>
        {orderedNodes.map((node) => {
          const position = nodePositions[node.id];

          return (
            <foreignObject height={nodeHeight} key={node.id} width={nodeWidth} x={position.x} y={position.y}>
              <article className={`case-node case-node-${node.status}`}>
                <div>
                  <strong>{node.label}</strong>
                  <span>{node.file}</span>
                </div>
                <em>{statusLabel(node.status)}</em>
              </article>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}
