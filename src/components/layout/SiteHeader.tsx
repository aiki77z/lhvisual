import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { InfinityMark } from "../brand/InfinityMark";
import { Wordmark } from "../brand/Wordmark";
import { repoUrl } from "../../data/paper";
import { getCurrentAppPath, toAppPath } from "../../lib/site";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Run", href: "/run" },
  { label: "Benchmarks", href: "/benchmarks" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Submit Task", href: "/submit-task" },
  { label: "About", href: "/about" },
  { label: "GitHub", href: repoUrl },
];

function isCurrent(href: string, path: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function SiteHeader() {
  const path = getCurrentAppPath();
  const navRef = useRef<HTMLElement | null>(null);
  // The block travels between the item the pointer is over and the item the page is on, so the
  // two positions are read as one object moving rather than as a highlight blinking off and on.
  const [hovered, setHovered] = useState<string | null>(null);
  const [block, setBlock] = useState<{ x: number; width: number } | null>(null);

  const marked = hovered ?? navItems.find((item) => isCurrent(item.href, path))?.label ?? null;

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !marked) {
      setBlock(null);
      return;
    }

    const measure = () => {
      const target = nav.querySelector<HTMLElement>(`[data-nav="${CSS.escape(marked)}"]`);
      if (!target) return;
      setBlock({ x: target.offsetLeft, width: target.offsetWidth });
    };

    measure();
    // Fonts land after first paint and the row rewraps with the viewport, so the block is
    // remeasured rather than left behind at a stale width.
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [marked, path]);

  // A block that has never been placed should appear at its destination rather than sliding in
  // from the left edge of the row.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (block) setSettled(true);
  }, [block]);

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <a className="brand" href={toAppPath("/")} aria-label="LoopsBench home">
          <span className="brand-mark" aria-hidden="true">
            <InfinityMark size={26} animate />
          </span>
          <Wordmark />
        </a>
        <nav
          className="site-nav"
          aria-label="Primary navigation"
          ref={navRef}
          onMouseLeave={() => setHovered(null)}
        >
          <span
            className="site-nav-block"
            aria-hidden="true"
            data-visible={block ? "true" : "false"}
            data-settled={settled ? "true" : "false"}
            style={block ? { transform: `translateX(${block.x}px)`, width: block.width } : undefined}
          />
          {navItems.map((item) => (
            <a
              key={item.label}
              data-nav={item.label}
              className={isCurrent(item.href, path) ? "nav-active" : ""}
              aria-current={isCurrent(item.href, path) ? "page" : undefined}
              href={toAppPath(item.href)}
              onMouseEnter={() => setHovered(item.label)}
              onFocus={() => setHovered(item.label)}
              onBlur={() => setHovered(null)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
