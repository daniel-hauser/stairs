# Copilot Instructions for `stairs`

## Product Intent
- Interactive stair configurator focused on practical geometry checks.
- Primary experience is 3D scene + optional 2D profile view.
- Fast iteration and visual clarity are higher priority than broad browser legacy support.

## Browser Baseline
- Target latest stable Chrome-class engines first.
- It is acceptable to use modern CSS/JS platform features without fallback unless explicitly requested.
- Prefer: `svh/dvh/lvh`, `color-mix()`, Pointer Events, `env(safe-area-inset-*)`, modern media/features queries.

## Instruction Maintenance
- Treat this file as a living source of truth.
- Whenever project decisions, UX rules, architecture, deployment behavior, or workflow expectations change, update this file in the same PR when practical.
- If any assistant behavior drifts from these instructions, correct the instructions and implementation together.

## GitHub Communication Format
- For GitHub-authored text interactions (issue bodies, issue comments, PR bodies, PR comments/replies), prefix content with:
  - `Copilot on behalf of @daniel-hauser`
- Keep this prefix rule applied consistently unless explicitly overridden by the user.

## Core UX Rules
- 3D is default view.
- 3D/2D is a toggle; selected view should fill the stage.
- Controls must minimize view obstruction:
  - Desktop: compact floating dock, hide/show capable.
  - Mobile: bottom sheet with visible drag handle and swipe to expand/collapse.
- Labels and dimensions are distinct concepts:
  - `labels` toggle controls entity labels only.
  - dimension callouts remain visible unless a dedicated dimension toggle is introduced.

## Current Architecture Snapshot
- `src/App.tsx`
  - App shell, control state, responsive behavior.
  - View mode state: `'3d' | '2d'`.
  - Control sheet open/closed state and mobile gesture handling.
- `src/components/StairScene.tsx`
  - Three.js/R3F scene and all 3D geometry.
  - Separate groups for entity labels and dimension callouts.
- `src/components/StairProfile2D.tsx`
  - 2D side profile rendering.
- `src/constants/geometryConfig.ts`
  - Generated geometry/material constants consumed by 3D logic.
- `.github/workflows/deploy-pages.yml`
  - GitHub Actions Pages deployment pipeline.

## Layout/Styling Conventions
- Keep controls dense and information-rich.
- On desktop, prioritize visible model area over panel size.
- On mobile, use stable viewport sizing (`svh`) with dynamic support (`dvh`) where useful.
- Avoid introducing layout jumps caused by browser UI chrome.

## Performance/Quality Expectations
- Keep 3D interactions responsive while sliders update.
- Build must pass (`npm run build`) after changes.
- Avoid adding heavy dependencies unless clearly justified.

## Deployment
- Repo is public and GitHub Pages is active.
- Live site URL: `https://daniel-hauser.github.io/stairs/`.

## Active Audit Task
- Track modernization work in issue #1:
  - `https://github.com/daniel-hauser/stairs/issues/1`
