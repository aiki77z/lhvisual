type HeroLink = { label: string; href: string };

type HeroLinksProps = {
  links: HeroLink[];
};

// Plain text resource links. No surrounding box; each link simply brightens
// (and reveals an underline) on hover or focus.
export function HeroLinks({ links }: HeroLinksProps) {
  return (
    <nav className="hero-links" aria-label="Resource links">
      {links.map((link) => (
        <a key={link.label} className="hero-link" href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
