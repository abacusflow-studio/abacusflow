# Progress

## 2026-06-01

- Started Web/Mobile icon alignment task.
- Ran planning session catchup; no unsynced report was returned.
- Recorded available prepared icon assets under `static/img/icon/*`.
- User clarified Web means `abacusflow-apps/apps/web`; inspected that Next app.
- Found Mobile Expo assets still use generated/resized files that do not match the prepared static icons.
- Regenerated Mobile icon assets from static source images.
- Removed Mobile adaptive icon background image config and deleted the now-unused `android-icon-background.png`.
- Copied prepared icons into `abacusflow-apps/apps/web/public/static/img/icon/`.
- Created a temporary icon preview sheet at `/tmp/abacusflow-icon-check.png` and visually checked the generated outputs.
- Mobile `npx expo export --platform web --output-dir /tmp/abacusflow-mobile-icon-export` passed.
- Updated `apps/web` icon references:
  - `src/app/layout.tsx` metadata now uses `/static/img/icon/*`.
  - `src/app/(admin)/layout.tsx` sidebar brand mark now uses the prepared icon via `next/image`.
  - `src/app/login/page.tsx` login brand mark now uses the prepared icon via `next/image`.
- `apps/web` `npm run build` passed; only existing warning is `src/components/order-list-page.tsx` missing `openDetail` in a hook dependency.
