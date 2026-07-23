import { InfinityMark } from "../brand/InfinityMark";
import { Wordmark } from "../brand/Wordmark";
import { repoUrl } from "../../data/paper";
import { getCurrentAppPath, toAppPath } from "../../lib/site";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Run", href: "/run" },
  { label: "Benchmarks", href: "/benchmarks" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Submit Task", href: "/submit-task" },
  { label: "About", href: "/about" },
  { label: "GitHub", href: repoUrl },
];

export function SiteHeader() {
  const path = getCurrentAppPath();

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <a className="brand" href={toAppPath("/")} aria-label="LoopsBench home">
          <span className="brand-mark" aria-hidden="true">
            <InfinityMark size={26} animate />
          </span>
          <Wordmark />
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              className={
                item.href !== "/" && (path === item.href || path.startsWith(`${item.href}/`))
                  ? "nav-active"
                  : item.href === path
                    ? "nav-active"
                    : ""
              }
              href={toAppPath(item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
