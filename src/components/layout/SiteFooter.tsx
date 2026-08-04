import { paperUrl, repoUrl, websiteRepoUrl } from "../../data/paper";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <p>
          <strong>LoopsBench</strong> — a long-horizon benchmark for loop
          engineering in coding agent evaluation.
        </p>
        <nav className="footer-links" aria-label="Project links">
          <a href={paperUrl}>Paper</a>
          <a href={repoUrl}>Benchmark source</a>
          <a href={websiteRepoUrl}>Website source</a>
        </nav>
      </div>
    </footer>
  );
}
