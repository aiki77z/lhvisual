import type { CSSProperties } from "react";
import { leaderboardEntries } from "../../data/leaderboard";
import { toAppPath } from "../../lib/site";
import { Wordmark } from "../brand/Wordmark";
import { DualContainerDiagram } from "./DualContainerDiagram";

const currentLeaders = leaderboardEntries
  .filter((entry) => entry.sweep === "model")
  .sort((a, b) => b.rrLoop - a.rrLoop)
  .slice(0, 3);

export function HomePage() {
  const topRate = currentLeaders[0]?.rrLoop ?? 0;

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-glow hero-glow-left" aria-hidden="true" />
        <div className="hero-glow hero-glow-right" aria-hidden="true" />
        <div className="home-hero-inner">
          <h1 id="home-title">
            <Wordmark className="home-wordmark" />
          </h1>
          <p className="home-thesis">
            From Harness Engineering to Loop Engineering
            <span>in Coding Agent Evaluation</span>
          </p>
          <div className="hero-prompt">
            <a className="hero-run-link" href={toAppPath("/run")}>Run your loop</a>
          </div>
        </div>
        <div className="hero-scroll-cue" aria-hidden="true">
          <span>Explore</span>
          <i />
        </div>
      </section>

      <div className="site-container home-content">
        <a
          className="performance-preview"
          href={toAppPath("/leaderboard")}
          aria-label={`View the leaderboard. The current top resolve rate is ${topRate.toFixed(2)} percent.`}
        >
          <div className="performance-heading">
            <div>
              <p className="section-index">Current frontier</p>
              <h2>The leading configuration resolves 25% of tasks.</h2>
            </div>
            <span className="inline-destination">
              Full leaderboard <span aria-hidden="true">↗</span>
            </span>
          </div>

          <div className="performance-summary">
            <div className="top-rate">
              <strong>{topRate.toFixed(2)}%</strong>
              <span>best resolve rate</span>
            </div>
            <p>
              The best reported configuration completes only one in four
              long-horizon tasks. The remaining track is the opportunity for
              better loops.
            </p>
          </div>

          <div className="performance-bars" aria-hidden="true">
            {currentLeaders.map((entry) => (
              <div className="performance-row" key={entry.id}>
                <div className="performance-label">
                  <span>{entry.model}</span>
                  <small>{entry.loop}</small>
                </div>
                <div className="performance-track">
                  <span
                    className="performance-fill"
                    style={{ "--resolve-rate": `${entry.rrLoop}%` } as CSSProperties}
                  />
                  <i className="performance-marker" style={{ left: `${entry.rrLoop}%` }} />
                </div>
                <strong>{entry.rrLoop.toFixed(2)}%</strong>
              </div>
            ))}
          </div>

          <div className="performance-scale" aria-hidden="true">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100%</span>
          </div>
        </a>

        <a className="submit-preview" href={toAppPath("/submit-task")}>
          <div className="submit-preview-heading">
            <div>
              <p className="section-index">Benchmark registry</p>
              <h2>Have a task that can break the loop?</h2>
            </div>
            <span className="inline-destination">
              Submit your task <span aria-hidden="true">↗</span>
            </span>
          </div>
          <p>
            Send us the task package, tests, and oracle notes through the
            existing review flow. Strong submissions become new pressure points
            for loop engineering.
          </p>
        </a>

        <section className="protocol-section" aria-labelledby="protocol-title">
          <div className="protocol-copy">
            <div>
              <p className="section-index">Evaluation protocol</p>
              <h2 id="protocol-title">Dual-container snapshot evaluation</h2>
            </div>
            <div className="protocol-intro">
              <p>
                Two isolated containers let the coding loop continue while an
                independent watcher evaluates qualifying workspace snapshots and
                keeps tests for completed units active as regression obligations.
              </p>
              <a className="text-action" href={toAppPath("/about")}>
                How LoopsBench works <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <DualContainerDiagram />
        </section>
      </div>
    </div>
  );
}
