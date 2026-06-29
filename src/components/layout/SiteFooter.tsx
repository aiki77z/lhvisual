import { repoUrl } from "../../data/paper";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <p>
          <strong>LoopsBench</strong> — a long-horizon benchmark for loop
          engineering in coding agent evaluation.
        </p>
        <div className="footer-links" aria-label="Footer links">
          <a href={repoUrl}>GitHub</a>
          <a href="#">Paper</a>
          <a href="#">Dataset</a>
        </div>
      </div>
    </footer>
  );
}
