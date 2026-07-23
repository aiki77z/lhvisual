import { AboutPage } from "./components/about/AboutPage";
import { HomePage } from "./components/home/HomePage";
import { PageShell } from "./components/layout/PageShell";
import { LeaderboardPage } from "./components/leaderboard/LeaderboardPage";
import { RunLoopsBenchPage } from "./components/run/RunLoopsBenchPage";
import { SubmissionStatusPage } from "./components/submit/SubmissionStatusPage";
import { SubmitTaskPage } from "./components/submit/SubmitTaskPage";
import { getCurrentAppPath, toAppPath } from "./lib/site";

export function App() {
  const path = getCurrentAppPath();

  let page = <HomePage />;

  if (path === "/") {
    page = <HomePage />;
  } else if (path === "/run" || path === "/run-loopsbench") {
    page = <RunLoopsBenchPage />;
  } else if (path === "/leaderboard") {
    page = <LeaderboardPage />;
  } else if (path === "/submit-task") {
    page = <SubmitTaskPage />;
  } else if (path === "/submit-task/status") {
    page = <SubmissionStatusPage />;
  } else if (path === "/about") {
    page = <AboutPage />;
  } else {
    page = (
      <section className="article-shell" aria-labelledby="not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>
          <a className="text-link" href={toAppPath("/")}>
            Return home
          </a>
        </p>
      </section>
    );
  }

  return <PageShell>{page}</PageShell>;
}
