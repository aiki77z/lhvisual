import { repoUrl } from "../../data/paper";
import { toAppPath } from "../../lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <p>
          <strong>LoopsBench</strong> — a long-horizon benchmark for loop
          engineering in coding agent evaluation.
        </p>
        <div className="footer-links" aria-label="Footer links">
          <a href={toAppPath("/run")}>Run</a>
          <a href={toAppPath("/submit-task")}>Submit</a>
          <a href={toAppPath("/benchmarks")}>Benchmarks</a>
          <a href={toAppPath("/leaderboard")}>Leaderboard</a>
          <a href={toAppPath("/about")}>About</a>
          <a href={repoUrl}>GitHub</a>
        </div>
      </div>
    </footer>
  );
}
