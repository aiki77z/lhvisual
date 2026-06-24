function normalizeBasePath(value: string) {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export const siteBasePath = normalizeBasePath(import.meta.env.BASE_URL);

export function getCurrentAppPath(pathname = window.location.pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const basePrefix =
    siteBasePath === "/" ? "" : siteBasePath.replace(/\/$/, "");

  if (basePrefix && normalizedPath.startsWith(basePrefix)) {
    const relativePath = normalizedPath.slice(basePrefix.length);
    return relativePath || "/";
  }

  return normalizedPath;
}

export function toAppPath(path: string) {
  if (
    path.startsWith("#") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("mailto:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${siteBasePath}${normalizedPath}`;
}
