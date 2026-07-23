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
      <SiteHeader />
      <main className="site-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
