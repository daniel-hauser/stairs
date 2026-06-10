# Stairs

React + Three.js stair configurator and visualizer, with automated GitHub Pages deployment.

## Repository Layout

- `stairs-r3f/`: main Vite + React + TypeScript application
- `stairs-r3f/src/`: app source code (2D profile, 3D scene, controls)
- `scripts/generate-geometry-config.mjs`: syncs geometry config into the React app
- `stairs-geometry-config.json`: source-of-truth geometry/material settings
- `.github/workflows/deploy-pages.yml`: CI build + GitHub Pages deployment workflow

## Local Development

Requirements:

- Node.js 20+
- npm 10+

Install and run:

```bash
cd stairs-r3f
npm ci
npm run dev
```

## Build

```bash
npm --prefix stairs-r3f run build
```

## Geometry Config Sync

When changing `stairs-geometry-config.json`, regenerate app constants with:

```bash
npm --prefix stairs-r3f run sync-geometry
```

## Deployment

Push to `main` to trigger `.github/workflows/deploy-pages.yml`.
GitHub Pages URL: [https://daniel-hauser.github.io/stairs/](https://daniel-hauser.github.io/stairs/)

The workflow:

1. installs dependencies in `stairs-r3f`
2. builds the production bundle
3. uploads `stairs-r3f/dist`
4. deploys to GitHub Pages

## Notes

- The legacy standalone HTML prototype has been removed.
- The React app under `stairs-r3f` is now the single source for rendering and deployment.
