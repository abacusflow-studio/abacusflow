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
