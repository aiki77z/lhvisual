import { useEffect, useState } from "react";
import { caseSummary, replayTimeline } from "../../data/caseReplay";
import { CaseDag } from "./CaseDag";
import { TerminalReplay } from "./TerminalReplay";

export function CaseReplayCard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeStep = replayTimeline[stepIndex];
  const isFinished = stepIndex === replayTimeline.length - 1;

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    if (isFinished) {
      setIsPlaying(false);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setStepIndex((current) => {
        const next = Math.min(current + 1, replayTimeline.length - 1);

        if (next === replayTimeline.length - 1) {
          setIsPlaying(false);
        }

        return next;
      });
    }, 900);

    return () => window.clearInterval(interval);
  }, [isFinished, isPlaying]);

  function handlePlay() {
    if (isFinished) {
      setStepIndex(0);
    }

    setIsPlaying(true);
  }

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
        <button className="replay-play-button" disabled={isPlaying} onClick={handlePlay} type="button">
          <span aria-hidden="true">{isFinished ? "↻" : "▶"}</span>
          {isPlaying ? "Playing" : isFinished ? "Replay" : "Play replay"}
        </button>
      </div>
      <div className="case-replay-grid">
        <CaseDag activeStep={activeStep} />
        <TerminalReplay activeTime={activeStep.at} />
      </div>
    </section>
  );
}
