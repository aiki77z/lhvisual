import { caseDagEdges, caseDagNodes, type CaseDagNode, type ReplayStep } from "../../data/caseReplay";

const layerLabels = ["L0-1 graph API", "L2-3 eval", "L4-5 tensor math", "L6-7 fused/model", "L8-9 training"];
const layerX = [30, 266, 502, 738, 974] as const;
const nodeWidth = 162;
const nodeHeight = 34;
const nodeGap = 6;

const nodeOrder = [
  "graph_node_factories",
  "fused_node_factories",
  "node_dispatch_ops",
  "elementwise_arithmetic_ops",
  "comparison_division_utils",
  "topological_evaluator",
  "reduction_expand_ops",
  "reverse_mode_gradients",
  "broadcast_log_ops",
  "linear_algebra_ops",
  "activation_math_ops",
  "softmax_ops",
  "layernorm_ops",
  "fused_softmax_op",
  "softmax_loss_graph",
  "fused_layernorm_op",
  "transformer_forward",
  "sgd_epoch_loop",
  "train_model_graph_build",
  "train_model_runtime_bindings",
] as const;

const yOffset = 30;

function visualLayer(layer: number) {
  return Math.min(Math.floor(layer / 2), layerX.length - 1);
}

function statusLabel(status: CaseDagNode["status"]) {
  if (status === "done") return "passed";
  if (status === "running") return "agent";
  if (status === "testing") return "tests";
  return status;
}

type CaseDagProps = {
  activeStep: ReplayStep;
};

export function CaseDag({ activeStep }: CaseDagProps) {
  const orderedNodes = nodeOrder
    .map((id) => {
      const node = caseDagNodes.find((candidate) => candidate.id === id);

      if (!node) {
        return undefined;
      }

      return {
        ...node,
        status: activeStep.statuses[node.id] ?? node.status,
      };
    })
    .filter((node): node is CaseDagNode => Boolean(node));

  const nodePositions = Object.fromEntries(
    orderedNodes.map((node) => {
      const nodeVisualLayer = visualLayer(node.layer);
      const layerNodes = orderedNodes.filter((candidate) => visualLayer(candidate.layer) === nodeVisualLayer);
      const layerIndex = layerNodes.findIndex((candidate) => candidate.id === node.id);

      return [
        node.id,
        {
          x: layerX[nodeVisualLayer],
          y: yOffset + layerIndex * (nodeHeight + nodeGap),
        },
      ];
    }),
  );

  return (
    <div className="case-dag" aria-label="MLSys Autodiff PA1 dependency DAG">
      <svg className="case-dag-svg" viewBox="0 0 1166 292" role="img">
        <title>MLSys Autodiff PA1 DAG</title>
        <desc>
          Dependency graph showing the task-native MLSys Autodiff requirement order collapsed into compact layer
          groups for replay.
        </desc>
        {layerLabels.map((label, layer) => (
          <text className="case-dag-layer-title" key={label} x={layerX[layer]} y="21">
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
            const isHotEdge = edge.to === activeStep.activeNodeId || edge.from === activeStep.activeNodeId;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  className={`case-dag-edge${isActiveEdge ? " case-dag-edge-active" : ""}${
                    isHotEdge ? " case-dag-edge-hot" : ""
                  }`}
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                />
                <circle className="case-dag-port" cx={startX} cy={startY} r="2" />
                <circle className="case-dag-port" cx={endX} cy={endY} r="2" />
              </g>
            );
          })}
        </g>
        {orderedNodes.map((node) => {
          const position = nodePositions[node.id];

          return (
            <foreignObject height={nodeHeight} key={node.id} width={nodeWidth} x={position.x} y={position.y}>
              <article
                className={`case-node case-node-${node.status}${
                  node.id === activeStep.activeNodeId ? " case-node-current" : ""
                }`}
              >
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
