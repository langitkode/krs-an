# Lighthouse Mobile Performance Fix

## Problem
FCP 3.0s, LCP 6.0s on mobile (Slow 3G + 4x CPU). Desktop fine.

Root cause waterfall:
```
HTML -> JS modules -> JS parse (3-4s on 4x CPU) -> CSS (via JS import)
                                                    -> font files discovered
                                                    -> <img> discovered -> SVG fetch
```

Hero SVG (49 KB) is JS-render-blocked: browser cannot discover it until JS parses + React renders ScheduleConfig. No `<link rel="preload">` exists.

## Changes

### 1. Preload hero SVG in index.html
Add `<link rel="preload" href="/assets/hero-config.svg" as="image">`.
Decouples SVG fetch from JS pipeline. Starts downloading parallel to JS modules.

### 2. Re-optimize SVG with SVGO
`public/assets/hero-config.svg` is 49 KB. Run SVGO aggressive mode to drop to ~12 KB. Fewer bytes = faster transfer on Slow 3G.

### Not in scope
- Font preload (hashed filenames from Vite, need plugin)
- CSS extraction (needs build config change)
- JS bundle splitting (already split, further gains need lazy() + Suspense)

## Estimated improvement
| Metric | Before | After |
|--------|--------|-------|
| LCP | 6.0s | ~4.5s |
| FCP | 3.0s | ~2.5s |
| Speed Index | 4.3s | ~3.5s |
