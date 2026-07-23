import type { DagPreviewUnitLayer } from "../../types/benchmarks";

type DagLayerBarsProps = {
  layers: DagPreviewUnitLayer[];
  compact?: boolean;
};

export function DagLayerBars({ layers, compact = false }: DagLayerBarsProps) {
  const maxUnits = Math.max(...layers.map((layer) => layer.unitCount), 1);
  const plotHeight = compact ? 44 : 140;

  return (
    <div className={`dag-bars${compact ? " dag-bars-compact" : ""}`} aria-label="Unit DAG layer distribution">
      <div className="dag-bars-plot">
        {layers.map((layer) => {
          const totalHeight = Math.max(8, Math.round((layer.unitCount / maxUnits) * plotHeight));
          const testedHeight = layer.unitCount
            ? Math.max(2, Math.round((layer.testedUnitCount / layer.unitCount) * totalHeight))
            : 0;

          return (
            <div className="dag-bars-slot" key={layer.layer}>
              {!compact ? <strong>{layer.unitCount.toLocaleString()}</strong> : null}
              <div className="dag-bars-track">
                <span className="dag-bars-total" style={{ height: `${totalHeight}px` }} />
                {layer.testedUnitCount > 0 ? (
                  <span className="dag-bars-tested" style={{ height: `${testedHeight}px` }} />
                ) : null}
              </div>
              {!compact ? (
                <span className="dag-bars-label">
                  L{layer.layer}
                  <small>{layer.testedUnitCount.toLocaleString()} tested</small>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
