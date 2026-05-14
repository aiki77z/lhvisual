const navItems = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Blog", href: "/blog" },
  { label: "Docs", href: "#docs" },
  { label: "GitHub", href: "https://github.com/" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <a className="brand" href="/" aria-label="Longhorizenbench home">
          <span className="brand-mark" aria-hidden="true">
            LH
          </span>
          <span>Longhorizenbench</span>
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
