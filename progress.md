# Progress

## 2026-05-26

- Started mobile app stabilization and release-prep task.
- Read relevant planning and UI/UX skill instructions.
- Ran planning session catchup; found unrelated prior backend bootstrap context and recorded it as background only.
- Ran mobile design-system/React Native guidance lookup.
- Audited mobile file list, package/app config, auth provider, order entry screens, and shared form components.
- Reset planning files for the mobile task.
- Installed Expo-compatible `expo-auth-session` and `expo-secure-store`.
- Added mobile runtime app config and wired mobile auth to Auth0 authorization code + PKCE, SecureStore token persistence, refresh/logout, and backend `/me/bootstrap`.
- Added `AuthGate` to block the Expo Router stack until config and login state are ready.
- Updated order entry so purchase orders use selectable products and sale orders use selectable inventory units.
- Updated stale mobile API calls to the current generated OpenAPI request shapes across dashboard, orders, inventory, product, depot, partner, and user screens.
- Added EAS release config, mobile env example, fixed Expo app IDs/scheme, and added package scripts for typecheck and EAS builds.
- Aligned Expo SDK 54 package versions with `npx expo install`; npm audit still reports 22 vulnerabilities without applying breaking `--force` fixes.
- Verification passed: `npm run typecheck`, `npm run lint`, `git diff --check`, and `npx expo config --type public`.
- Changed `@abacusflow/core` OpenAPI post-generation script to remove `.js` suffixes from relative imports, removed the need for mobile Metro resolver hacks, and simplified web Next config accordingly.
- Verified the extensionless OpenAPI import strategy with mobile typecheck, mobile Web export, mobile Android export, and web production build.

## 2026-05-27

- Started a documentation-only mobile整改方案 focused on repositioning the app from management to fast data entry.
- Ran planning session catchup; found current uncommitted scan/barcode work and an Expo Camera native-module discussion, which should be included in the developer plan.
- Checked current git diff stat and mobile file inventory before auditing screens.
- Audited mobile root layout, tabs, home, more, scanner, product add, purchase add, sale add, list/form shared components, tokens, app config, and auth storage wrapper.
- Ran `ui-ux-pro-max` design/UX lookups for React Native/mobile entry guidance and recorded touch/feedback constraints.
- Created `docs/mobile-entry-redesign-plan.md` with product positioning, IA, flow, style, component, API, implementation, and acceptance guidance.
- Verified the new document with `git diff --check -- docs/mobile-entry-redesign-plan.md task_plan.md findings.md progress.md`.

## 2026-05-27

- Started plan-only task for Web/Mobile issue collection and Android APK download link/QR distribution.
- Ran planning catchup and confirmed current worktree was clean before this documentation task.
- Audited `.github` workflows, Web app layout/components, Mobile tabs/Me page, Mobile EAS config, and backend OpenAPI/module structure.
- Consulted Expo official documentation search results for internal APK distribution and EAS environment variable behavior.
- Created `docs/feedback-and-mobile-download-plan.md` covering backend feedback APIs, Web/Mobile UX, Android QR download page, EAS APK publishing, and `.github` workflow changes.
