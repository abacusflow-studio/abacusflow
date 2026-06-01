# Progress

## 2026-06-01

- Started Mobile component structure cleanup.
- Counted active `src` files and identified the main confusion point: feature screens lack an explicit responsibility map.
- Reset planning files for this task.
- Audited route shells, page templates, and feature screen names.
- Renamed default function symbols so they match their file names.
- Added `src/README.md`, `src/app/README.md`, `src/features/README.md`, and `src/components/README.md`.
- Updated `apps/mobile/README.md` to point to the new structure maps.
- Added feature-level public export files and changed route shells to use them.
- `npm run typecheck` passed.
- `npm run lint` passed with the existing 3 warnings in `purchase-entry-screen.tsx`.
- `git diff --check` passed.
