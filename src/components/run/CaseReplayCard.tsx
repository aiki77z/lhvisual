import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { caseSummary, replayTimeline } from "../../data/caseReplay";
import { CaseDag } from "./CaseDag";
import { TerminalReplay } from "./TerminalReplay";

function timelineSecond(at: string) {
  const [, minutes, seconds] = at.match(/^(\d+):(\d+):(\d+)$/) ?? [];
  return Number(minutes) * 60 + Number(seconds);
}

function playbackTime(realSeconds: number) {
  return realSeconds <= 30 ? realSeconds * 0.28 : 8.4 + (realSeconds - 30) * 0.025;
}

export function CaseReplayCard() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState(0);
  const startedAtRef = useRef(0);

  const replaySteps = useMemo(() => {
    const start = timelineSecond(replayTimeline[0].at);
    return replayTimeline.map((step) => ({
      ...step,
      playbackAt: playbackTime(timelineSecond(step.at) - start),
    }));
  }, []);

  const activeStep =
    [...replaySteps].reverse().find((step) => step.playbackAt <= playhead) ?? replaySteps[0];
  const isFinished = duration > 0 && playhead >= duration;

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    startedAtRef.current = performance.now() - playhead * 1000;
    let frame = 0;

    function tick() {
      const next = Math.min((performance.now() - startedAtRef.current) / 1000, duration);
      setPlayhead(next);

      if (next >= duration) {
        setIsPlaying(false);
        return;
      }

      frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, isPlaying, playhead]);

  const handleDurationChange = useCallback((nextDuration: number) => {
    setDuration(nextDuration);
  }, []);

  function handlePlay() {
    if (isFinished) {
      setPlayhead(0);
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

      <div className="replay-console">
        <div className="replay-status-strip" aria-live="polite">
          <div>
            <span>{activeStep.at}</span>
            <strong>{activeStep.title}</strong>
            <p>{activeStep.detail}</p>
          </div>
          <button className="replay-play-button" disabled={isPlaying || duration === 0} onClick={handlePlay} type="button">
            <span aria-hidden="true">{isFinished ? "R" : ">"}</span>
            {isPlaying ? "Playing" : isFinished ? "Replay" : "Play cast replay"}
          </button>
        </div>
        <div className="case-replay-grid">
          <CaseDag activeStep={activeStep} />
          <TerminalReplay onDurationChange={handleDurationChange} playhead={playhead} />
        </div>
      </div>
    </section>
  );
}
