# SEO + LCP Improvement Plan

## Goal

Keep lightweight SPA feel. Improve LCP (Largest Contentful Paint) and SEO on first load via build-time prerendering.

No SSR, no framework swap. SPA remains identical after JS hydrates.

---

## Approach: `@prerenderer/rollup-plugin` + Puppeteer

At build time, puppeteer loads each route in a headless browser, waits for React to render, then saves static HTML to disk.

### How it works

| Step | What happens |
|---|---|
| `vite build` | Builds normal SPA bundle |
| Prerenderer runs | Opens each route in puppeteer, waits for `prerender-ready` event |
| Output | `dist/index.html` (normal) + `dist/privacy/index.html` + `dist/terms/index.html` (prerendered) |
| Browser loads | Sees full HTML immediately → **LCP improves** |
| Googlebot crawls | Sees content without executing JS → **SEO improves** |
| JS hydrates | React takes over same DOM → SPA works identically |

---

## Routes

### Prerender (static, known at build time)

| Route | Priority | Notes |
|---|---|---|
| `/` | High | Main landing — highest SEO/LCP priority |
| `/privacy` | Medium | Static legal page |
| `/terms` | Medium | Static legal page |

### Skip (dynamic or auth-gated)

| Route | Reason |
|---|---|
| `/share/:shareId` | Unknown shareIds at build time. Shared plans are person-to-person, not search indexing. |
| `/admin` | Auth-gated, empty without login. |

---

## Implementation

### Step 1: Install dependencies

```
npm i -D @prerenderer/rollup-plugin @prerenderer/renderer-puppeteer puppeteer
```

### Step 2: Add render trigger in `src/main.tsx`

After `createRoot(...).render(...)` call, add:

```typescript
requestAnimationFrame(() => {
  document.dispatchEvent(new Event("prerender-ready"));
});
```

Puppeteer waits for this event before capturing HTML. The `requestAnimationFrame` ensures at least one React render cycle has completed.

### Step 3: Configure `vite.config.ts`

```typescript
import prerender from "@prerenderer/rollup-plugin";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    prerender({
      routes: ["/", "/privacy", "/terms"],
      renderer: "@prerenderer/renderer-puppeteer",
      rendererOptions: {
        renderAfterDocumentEvent: "prerender-ready",
        renderAfterTime: 10000, // 10s timeout fallback
        headless: true,
      },
      postProcess(renderedRoute) {
        // Replace localhost URLs with production domain
        renderedRoute.html = renderedRoute.html
          .replace(/https?:\/\/localhost:\d+/g, "https://krsan.web.id");
      },
    }),
  ],
  // ...rest of vite config
});
```

### Step 4: Update `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://krsan.web.id/</loc>
    <lastmod>2026-07-18</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://krsan.web.id/privacy</loc>
    <lastmod>2026-07-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://krsan.web.id/terms</loc>
    <lastmod>2026-07-18</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

### Step 5: Create `public/llms.txt`

AI-readable markdown guide:

```markdown
# KRSan

> Platform optimasi jadwal perkuliahan untuk mahasiswa Indonesia.
> Membantu menyusun jadwal KRS tanpa bentrok menggunakan algoritma
> penjadwalan dan AI.

## Pages

- [Beranda](https://krsan.web.id/): Penyusun jadwal kuliah online
- [Kebijakan Privasi](https://krsan.web.id/privacy): Informasi data yang dikumpulkan
- [Syarat & Ketentuan](https://krsan.web.id/terms): Ketentuan penggunaan
```

### Step 6: `public/robots.txt`

No changes needed. Current config blocks training crawlers (GPTBot, Google-Extended, etc.) while allowing search crawlers. This is correct.

---

## Build Output

After `npm run build`:

```
dist/
  index.html              ← prerendered homepage (full layout + CSS)
  privacy/
    index.html            ← prerendered privacy page
  terms/
    index.html            ← prerendered terms page
  assets/                 ← unchanged
```

---

## What Improves

| Metric | Before | After |
|---|---|---|
| LCP | Depends on JS parse + mount time | HTML has content immediately |
| First Paint | After React bundle loads | During HTML parse |
| Google indexing | Requires JS execution (unreliable) | Full content in raw HTML |
| Bundle size | SPA + vendor | Same bundle (prerender adds no JS) |
| Dev experience | Hot reload, SPA | Unchanged — all build-time only |

---

## Limitations

- **Convex data not prerendered**: Puppeteer runs at build time, no Convex backend available. Config page will render with loading shells for dropdowns. Page structure, fonts, hero image still present — LCP still improves.
- **Share pages not prerendered**: `/share/:shareId` is dynamic. If SEO for shared plans becomes important later, consider dynamic rendering (detect crawler user-agent → server-side render on the fly).
- **Build time increase**: Puppeteer adds ~5-15s to build time (launch browser + render 3 pages).

---

## MCP Resources

- [@prerenderer/rollup-plugin](https://github.com/tofandel/prerenderer)
- [llms.txt spec](https://llmstxt.org/)
