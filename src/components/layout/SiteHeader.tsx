import { repoUrl } from "../../data/paper";
import { getCurrentAppPath, toAppPath } from "../../lib/site";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
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
            LB
          </span>
          <span>LoopsBench</span>
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              className={item.href === path ? "nav-active" : ""}
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
