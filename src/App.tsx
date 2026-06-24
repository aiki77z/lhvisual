import { BlogArticle } from "./components/blog/BlogArticle";
import { BlogIndex } from "./components/blog/BlogIndex";
import { PageShell } from "./components/layout/PageShell";
import { LeaderboardPage } from "./components/leaderboard/LeaderboardPage";
import { posts } from "./data/posts";
import { getCurrentAppPath, toAppPath } from "./lib/site";

export function App() {
  const path = getCurrentAppPath();
  const slug = path.startsWith("/blog/") ? path.replace("/blog/", "") : "";
  const post = posts.find((item) => item.slug === slug);

  let page = <LeaderboardPage />;

  if (path === "/" || path === "/leaderboard") {
    page = <LeaderboardPage />;
  } else if (path === "/blog") {
    page = <BlogIndex />;
  } else if (post) {
    page = <BlogArticle post={post} />;
  } else {
    page = (
      <section className="not-found" aria-labelledby="not-found-title">
        <p className="eyebrow">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>The requested page is not part of this scaffold yet.</p>
        <a className="text-link" href={toAppPath("/")}>
          Return to the leaderboard
        </a>
      </section>
    );
  }

  return <PageShell>{page}</PageShell>;
}
