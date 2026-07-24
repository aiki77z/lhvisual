import { useEffect, useState, type ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    function updateScrollEdges() {
      const root = document.documentElement;
      setAtTop(window.scrollY <= 2);
      setAtBottom(window.scrollY + window.innerHeight >= root.scrollHeight - 2);
      // Progressive top blur: ramps 0 -> 1 across the first ~70% of a viewport.
      const progress = Math.min(1, window.scrollY / (window.innerHeight * 0.7));
      root.style.setProperty("--scroll-blur", progress.toFixed(3));
    }

    updateScrollEdges();
    window.addEventListener("scroll", updateScrollEdges, { passive: true });
    window.addEventListener("resize", updateScrollEdges);

    return () => {
      window.removeEventListener("scroll", updateScrollEdges);
      window.removeEventListener("resize", updateScrollEdges);
    };
  }, []);

  const edgeClasses = [atTop ? "at-page-top" : "", atBottom ? "at-page-bottom" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`site-frame ${edgeClasses}`}>
      <div className="scroll-blur-veil" aria-hidden="true" />
      <SiteHeader />
      <main className="site-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
