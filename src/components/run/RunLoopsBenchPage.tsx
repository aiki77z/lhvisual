import { runGuideSections } from "../../data/caseReplay";
import { CaseReplayCard } from "./CaseReplayCard";
import { RunGuideSection } from "./RunGuideSection";

function sectionId(title: string) {
  return title.toLowerCase().replace(/\s+/g, "-");
}

export function RunLoopsBenchPage() {
  return (
    <div className="site-container run-page">
      <header className="run-hero">
        <p className="eyebrow">Run guide</p>
        <h1>How to run LoopsBench?</h1>
      </header>

      <CaseReplayCard />

      <div className="run-layout">
        <aside className="run-toc" aria-label="Run guide sections">
          <span>On this page</span>
          {runGuideSections.map((section) => (
            <a key={section.title} href={`#${sectionId(section.title)}`}>
              {section.title}
            </a>
          ))}
        </aside>
        <div className="run-guide">
          <p className="run-intro">
            LoopsBench evaluates long-horizon coding agents on executable tasks with
            dependency DAGs, released unit tests, and final acceptance checks. A run
            should first validate the harness, then execute the agent loop, and finally
            inspect the verifier artifacts.
          </p>
          {runGuideSections.map((section) => (
            <div id={sectionId(section.title)} key={section.title}>
              <RunGuideSection {...section} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
