import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBasePath(value: string) {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function getSiteBasePath() {
  const explicitBasePath = process.env.VITE_BASE_PATH;

  if (explicitBasePath) {
    return normalizeBasePath(explicitBasePath);
  }

  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

  if (!repoName || repoName.endsWith(".github.io")) {
    return "/";
  }

  return normalizeBasePath(repoName);
}

function githubPagesFallback(basePath: string): Plugin {
  return {
    apply: "build",
    generateBundle() {
      const basePrefix = basePath === "/" ? "" : basePath.replace(/\/$/, "");
      const redirectTarget = `${basePrefix || ""}/`;
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting...</title>
    <meta name="robots" content="noindex" />
    <script>
      (function () {
        var basePrefix = ${JSON.stringify(basePrefix)};
        var route = window.location.pathname;

        if (basePrefix && route.startsWith(basePrefix)) {
          route = route.slice(basePrefix.length) || "/";
        }

        if (!route.startsWith("/")) {
          route = "/" + route;
        }

        var search = window.location.search
          ? window.location.search.slice(1)
          : "";
        var hash = window.location.hash ? window.location.hash.slice(1) : "";
        var target =
          ${JSON.stringify(redirectTarget)} +
          "?p=" +
          encodeURIComponent(route) +
          (search ? "&q=" + encodeURIComponent(search) : "") +
          (hash ? "&h=" + encodeURIComponent(hash) : "");

        window.location.replace(target);
      })();
    <\/script>
  </head>
  <body></body>
</html>`;

      this.emitFile({
        type: "asset",
        fileName: "404.html",
        source: html,
      });
    },
    name: "github-pages-fallback",
  };
}

const siteBasePath = getSiteBasePath();

export default defineConfig({
  base: siteBasePath,
  plugins: [react(), githubPagesFallback(siteBasePath)],
});
