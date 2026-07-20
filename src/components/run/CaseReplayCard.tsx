import { useEffect, useState } from "react";
import { caseSummary, replayTimeline } from "../../data/caseReplay";
import { CaseDag } from "./CaseDag";
import { TerminalReplay } from "./TerminalReplay";

export function CaseReplayCard() {
  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = replayTimeline[stepIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % replayTimeline.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, []);

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
            <dt>Result</dt>
            <dd>{caseSummary.result}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{caseSummary.model.replace("-20260305", "")}</dd>
          </div>
          <div>
            <dt>Commits</dt>
            <dd>{caseSummary.commits.length}</dd>
          </div>
        </dl>
      </div>
      <div className="replay-status-strip" aria-live="polite">
        <div>
          <span>{activeStep.at}</span>
          <strong>{activeStep.title}</strong>
          <p>{activeStep.detail}</p>
        </div>
      </div>
      <div className="case-replay-grid">
        <CaseDag activeStep={activeStep} />
        <TerminalReplay activeTime={activeStep.at} />
      </div>
    </section>
  );
}
