import { useEffect, useState } from "react";
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

const replayPhases: Array<Record<string, CaseDagNode["status"]>> = [
  {
    vector2_math: "testing",
    scoring_system: "running",
    transform_system: "ready",
    sim_world: "locked",
    replay_runner: "locked",
  },
  {
    vector2_math: "done",
    scoring_system: "done",
    transform_system: "running",
    sim_world: "ready",
    replay_runner: "locked",
  },
  {
    vector2_math: "done",
    scoring_system: "done",
    transform_system: "done",
    sim_world: "running",
    replay_runner: "locked",
  },
  {
    vector2_math: "done",
    scoring_system: "done",
    transform_system: "done",
    sim_world: "done",
    replay_runner: "testing",
  },
  {
    vector2_math: "done",
    scoring_system: "done",
    transform_system: "done",
    sim_world: "done",
    replay_runner: "done",
  },
];

function statusLabel(status: CaseDagNode["status"]) {
  if (status === "done") return "passed";
  if (status === "running") return "agent";
  if (status === "testing") return "tests";
  return status;
}

export function CaseDag() {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhaseIndex((current) => (current + 1) % replayPhases.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  const activePhase = replayPhases[phaseIndex];
  const orderedNodes = nodeOrder
    .map((id) => {
      const node = caseDagNodes.find((candidate) => candidate.id === id);

      if (!node) {
        return undefined;
      }

      return {
        ...node,
        status: activePhase[node.id] ?? node.status,
      };
    })
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
            const fromStatus = orderedNodes.find((node) => node.id === edge.from)?.status;
            const toStatus = orderedNodes.find((node) => node.id === edge.to)?.status;
            const isActiveEdge = fromStatus === "done" && toStatus !== "locked";

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  className={`case-dag-edge${isActiveEdge ? " case-dag-edge-active" : ""}`}
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                />
                <circle className="case-dag-port" cx={startX} cy={startY} r="2.4" />
                <circle className="case-dag-port" cx={endX} cy={endY} r="2.4" />
              </g>
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
