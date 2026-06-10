# stairs-r3f

React + TypeScript + Vite implementation of the stair visualizer.

## Commands

```bash
npm ci
npm run dev
npm run build
npm run lint
npm run preview
```

## Geometry Config

This app consumes generated config in `src/constants/geometryConfig.ts`.
Regenerate it from the repository root config via:

```bash
npm run sync-geometry
```

The source of truth is `../stairs-geometry-config.json`.
