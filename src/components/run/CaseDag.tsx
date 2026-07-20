import { caseDagEdges, caseDagNodes, type CaseDagNode } from "../../data/caseReplay";

const layerLabels = ["Ready frontier", "Math core", "Game systems", "Acceptance"];

function statusLabel(status: CaseDagNode["status"]) {
  if (status === "done") return "passed";
  if (status === "running") return "agent";
  if (status === "testing") return "tests";
  return status;
}

export function CaseDag() {
  const layers = layerLabels.map((label, layer) => ({
    label,
    nodes: caseDagNodes.filter((node) => node.layer === layer),
  }));

  return (
    <div className="case-dag" aria-label="MonoGame Math Arena dependency DAG">
      <div className="case-dag-lines" aria-hidden="true">
        {caseDagEdges.map((edge) => (
          <span key={`${edge.from}-${edge.to}`} title={edge.label} />
        ))}
      </div>
      {layers.map((layer) => (
        <section className="case-dag-layer" key={layer.label}>
          <div className="case-dag-layer-title">{layer.label}</div>
          <div className="case-dag-nodes">
            {layer.nodes.map((node) => (
              <article className={`case-node case-node-${node.status}`} key={node.id}>
                <div>
                  <strong>{node.label}</strong>
                  <span>{node.file}</span>
                </div>
                <em>{statusLabel(node.status)}</em>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
