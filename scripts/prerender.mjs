// Post-build prerender script.
// Runs after `vite build`. Uses @prerenderer/prerenderer directly to
// avoid Rollup plugin incompatibility with Rolldown (Vite 8).
// The rollup plugin's delete + emitFile pattern for root index.html
// silently fails under Rolldown.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  console.error("[prerender] dist/ not found. Run `vite build` first.");
  process.exit(1);
}

const { default: Prerenderer } = await import("@prerenderer/prerenderer");
const ROUTES = ["/", "/privacy", "/terms"];

const prerenderer = new Prerenderer({
  staticDir: distDir,
  indexPath: "index.html",
  routes: ROUTES,
  renderer: "@prerenderer/renderer-puppeteer",
  rendererOptions: {
    renderAfterDocumentEvent: "prerender-ready",
    timeout: 15000,
    headless: true,
  },
  postProcess(renderedRoute) {
    const routeUrl =
      renderedRoute.originalRoute === "/"
        ? "https://krsan.web.id"
        : `https://krsan.web.id${renderedRoute.originalRoute}`;

    renderedRoute.html = renderedRoute.html
      .replace(/https?:\/\/localhost:\d+/g, "https://krsan.web.id")
      .replace(
        /<meta property="og:url" content="[^"]*"/,
        `<meta property="og:url" content="${routeUrl}"`,
      )
      .replace(
        /<link rel="canonical" href="[^"]*"/,
        `<link rel="canonical" href="${routeUrl}"`,
      );
  },
});

let count = 0;
try {
  await prerenderer.initialize();
  const renderedRoutes = await prerenderer.renderRoutes(ROUTES);

  for (const route of renderedRoutes) {
    // Flat HTML files — avoids Cloudflare auto-trailing-slash for directories
    const filename =
      route.route === "/" ? "index.html" : `${route.route.replace(/^\//, "")}.html`;
    const fullPath = path.join(distDir, filename);

    fs.writeFileSync(fullPath, route.html.trim());
    console.log(
      `[prerender] ${filename} (${route.html.length} bytes)`,
    );
    count++;
  }
} finally {
  await prerenderer.destroy();
}

if (count !== ROUTES.length) {
  console.error(
    `[prerender] WARNING: expected ${ROUTES.length} routes, got ${count}`,
  );
  process.exit(1);
}

console.log(`[prerender] done — ${count} routes prerendered`);
