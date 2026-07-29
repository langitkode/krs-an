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
    renderedRoute.html = renderedRoute.html.replace(
      /https?:\/\/localhost:\d+/g,
      "https://krsan.web.id",
    );
  },
});

let count = 0;
try {
  await prerenderer.initialize();
  const renderedRoutes = await prerenderer.renderRoutes(ROUTES);

  for (const route of renderedRoutes) {
    const routePath =
      route.route === "/" ? "" : route.route.replace(/^\//, "");
    const outputPath = routePath
      ? path.join(routePath, "index.html")
      : "index.html";
    const fullPath = path.join(distDir, outputPath);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, route.html.trim());
    console.log(
      `[prerender] ${outputPath} (${route.html.length} bytes)`,
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
