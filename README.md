# Stairs

**[Live demo → https://daniel-hauser.github.io/stairs/](https://daniel-hauser.github.io/stairs/)**

React + Three.js stair configurator and 3D/2D visualizer with automated GitHub Pages deployment.

## Browser Baseline

- Target: latest stable Chrome-class browsers.
- We intentionally use modern web-platform features without legacy fallbacks unless explicitly requested.
- Current usage includes modern viewport units (`svh/lvh/dvh`), Pointer Events, `color-mix()`, safe-area env vars, and container queries.
- Tracking audit/task: [Issue #1](https://github.com/daniel-hauser/stairs/issues/1).

## Repository Layout

- `src/` — Vite + React + TypeScript application source
- `src/components/` — `StairScene.tsx` (3D), `StairProfile2D.tsx` (2D SVG)
- `src/constants/` — geometry/material config and stair defaults
- `stairs-geometry-config.json` — source-of-truth geometry and material settings
- `scripts/generate-geometry-config.mjs` — syncs geometry config into the React app
- `.github/workflows/deploy-pages.yml` — CI build + GitHub Pages deployment

## Local Development

Requirements: Node.js 20+, npm 10+

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

## Geometry Config Sync

When changing `stairs-geometry-config.json`, regenerate app constants with:

```bash
npm run sync-geometry
```

## Deployment

Push to `main` to trigger `.github/workflows/deploy-pages.yml`.

**GitHub Pages URL:** [https://daniel-hauser.github.io/stairs/](https://daniel-hauser.github.io/stairs/)

The workflow:
1. Installs dependencies
2. Builds the production bundle into `dist/`
3. Uploads artifact and deploys to GitHub Pages
