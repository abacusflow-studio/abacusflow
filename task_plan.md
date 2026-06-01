# Task Plan

## Goal

Make Web and Mobile use the prepared AbacusFlow icon assets from `static/img/icon/*` consistently.

## Phases

1. [complete] Inventory existing icon references in Web, Mobile, and shared static assets.
2. [complete] Decide the least invasive asset wiring for each platform.
3. [complete] Update configuration/assets so app icons resolve from the prepared icon set.
4. [complete] Run focused validation for Web and Mobile.
5. [complete] Summarize changed files and any remaining icon gaps.

## Decisions

- Preserve unrelated existing files and avoid broad UI icon refactors unless they are clearly app-icon related.
- Prefer reusing the source assets under `static/img/icon/*`; copy only where a platform requires local files.
- Keep platform-specific generated binaries where required by Expo/Electron, but derive them from `static/img/icon/*`.
- Do not replace the macOS `.icns` package icon until a prepared `.icns` exists under `static/img/icon/*`.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Web `npm run build` failed on `eslint.config.ts` type config and missing `src/core/openapi` import target | Validation | Recorded as existing non-icon blockers; Mobile export passed and icon file checks passed. |
