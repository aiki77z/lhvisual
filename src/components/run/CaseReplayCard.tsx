import { caseSummary } from "../../data/caseReplay";
import { CaseDag } from "./CaseDag";
import { TerminalReplay } from "./TerminalReplay";

export function CaseReplayCard() {
  return (
    <section className="case-replay-card" aria-labelledby="case-replay-title">
      <div className="case-replay-head">
        <div>
          <p className="eyebrow">Case replay</p>
          <h2 id="case-replay-title">{caseSummary.title}</h2>
          <p>{caseSummary.description}</p>
        </div>
        <dl className="case-metrics">
          <div>
            <dt>Units</dt>
            <dd>{caseSummary.units}</dd>
          </div>
          <div>
            <dt>Layers</dt>
            <dd>{caseSummary.layers}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd>{caseSummary.difficulty}</dd>
          </div>
        </dl>
      </div>
      <div className="case-replay-grid">
        <CaseDag />
        <TerminalReplay />
      </div>
    </section>
  );
}
