import type { ModuleDagDetail, ModuleDagNode } from "../../types/benchmarks";

type ModuleDagGraphProps = {
  dag: ModuleDagDetail;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
};

function sortNodes(left: ModuleDagNode, right: ModuleDagNode) {
  if (left.layer !== right.layer) {
    return left.layer - right.layer;
  }
  if (left.implOrder !== right.implOrder) {
    return left.implOrder - right.implOrder;
  }
  if (left.outdegree !== right.outdegree) {
    return right.outdegree - left.outdegree;
  }
  return left.label.localeCompare(right.label);
}

function compactPath(path: string) {
  const normalized = path.replace(/^\.\//, "").trim();
  if (!normalized || normalized === ".") {
    return "repo root";
  }
  const parts = normalized.split("/");
  if (parts.length <= 3) {
    return normalized;
  }
  return `.../${parts.slice(-2).join("/")}`;
}

export function ModuleDagGraph({ dag, selectedNodeId, onSelect }: ModuleDagGraphProps) {
  const layerCount = Math.max(dag.layerCount, 1);
  const groupedLayers = Array.from({ length: layerCount }, (_, layer) => ({
    layer,
    meta: dag.layers.find((item) => item.layer === layer),
    nodes: dag.nodes.filter((node) => node.layer === layer).sort(sortNodes),
  }));

  const nodeWidth = layerCount > 10 ? 228 : 252;
  const nodeHeight = 108;
  const rowGap = 16;
  const columnGap = layerCount > 10 ? 48 : 64;
  const leftPad = 28;
  const topPad = 64;
  const bottomPad = 28;
  const maxRows = Math.max(...groupedLayers.map((group) => group.nodes.length), 1);
  const width = leftPad * 2 + layerCount * nodeWidth + Math.max(layerCount - 1, 0) * columnGap;
  const height = topPad + maxRows * (nodeHeight + rowGap) - rowGap + bottomPad;
  const displayWidth = Math.max(width, 980);
  const displayHeight = Math.max(height, 360);

  const positions = Object.fromEntries(
    groupedLayers.flatMap((group, layerIndex) =>
      group.nodes.map((node, rowIndex) => [
        node.id,
        {
          x: leftPad + layerIndex * (nodeWidth + columnGap),
          y: topPad + rowIndex * (nodeHeight + rowGap),
        },
      ]),
    ),
  ) as Record<string, { x: number; y: number }>;

  return (
    <div className="module-dag-shell">
      <div className="module-dag-scroller">
        <svg
          className="module-dag-svg"
          style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${dag.project} module dependency DAG`}
        >
          <title>{dag.project} module dependency DAG</title>
          <desc>{dag.description}</desc>
          {groupedLayers.map((group, layerIndex) => {
            const x = leftPad + layerIndex * (nodeWidth + columnGap);
            return (
              <g key={`layer-${group.layer}`}>
                <text className="module-dag-layer-title" x={x} y="24">
                  Layer {group.layer}
                </text>
                <text className="module-dag-layer-meta" x={x} y="42">
                  {(group.meta?.nodeCount ?? group.nodes.length).toLocaleString()} modules
                </text>
              </g>
            );
          })}

          <g aria-hidden="true">
            {dag.edges.map((edge) => {
              const from = positions[edge.from];
              const to = positions[edge.to];
              if (!from || !to) {
                return null;
              }
              const startX = from.x + nodeWidth;
              const startY = from.y + nodeHeight / 2;
              const endX = to.x;
              const endY = to.y + nodeHeight / 2;
              const midX = startX + (endX - startX) * 0.5;
              const isActive = edge.from === selectedNodeId || edge.to === selectedNodeId;

              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  className={`module-dag-edge${isActive ? " module-dag-edge-active" : ""}`}
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                />
              );
            })}
          </g>

          {groupedLayers.flatMap((group) =>
            group.nodes.map((node) => {
              const position = positions[node.id];
              const isSelected = node.id === selectedNodeId;
              return (
                <foreignObject
                  key={node.id}
                  x={position.x}
                  y={position.y}
                  width={nodeWidth}
                  height={nodeHeight}
                >
                  <button
                    className={`module-dag-node${isSelected ? " module-dag-node-selected" : ""}`}
                    type="button"
                    title={`${node.label}\n${node.path}\n${node.filesCount.toLocaleString()} files · ${node.loc.toLocaleString()} LOC`}
                    onClick={() => onSelect(node.id)}
                  >
                    <span className="module-dag-node-title">{node.label}</span>
                    <span className="module-dag-node-path">{compactPath(node.path)}</span>
                    <span className="module-dag-node-meta">
                      {node.filesCount.toLocaleString()} files · {node.loc.toLocaleString()} LOC
                    </span>
                  </button>
                </foreignObject>
              );
            }),
          )}
        </svg>
      </div>
    </div>
  );
}
