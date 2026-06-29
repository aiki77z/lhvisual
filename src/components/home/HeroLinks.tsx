import { useLayoutEffect, useRef, useState } from "react";

type HeroLink = { label: string; href: string };

type HeroLinksProps = {
  links: HeroLink[];
};

// Sliding-spotlight navigation: a frosted window glides to the hovered link
// and that link sharpens while the others recede. The window rests on the
// first link by default.
export function HeroLinks({ links }: HeroLinksProps) {
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const el = itemRefs.current[active];
    if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, links.length]);

  return (
    <nav
      className="hero-links"
      aria-label="Resource links"
      onMouseLeave={() => setActive(0)}
    >
      <span
        className="hero-links-spot"
        style={{ transform: `translateX(${box.left}px)`, width: box.width }}
        aria-hidden="true"
      />
      {links.map((link, i) => (
        <a
          key={link.label}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className={`hero-link ${active === i ? "is-active" : ""}`}
          href={link.href}
          onMouseEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
