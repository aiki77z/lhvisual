import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="site-frame">
      <SiteHeader />
      <main className="site-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
