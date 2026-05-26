# Findings

- Mobile app lives at `abacusflow-apps/apps/mobile` and uses Expo Router (`main: expo-router/entry`).
- Mobile auth provider has been replaced with Expo AuthSession + SecureStore. It uses Auth0 authorization code + PKCE, stores refreshable tokens, syncs `/me/bootstrap`, and exposes a reactive `AuthGate`.
- Mobile app now imports `config/app-config.ts`, calls `setAppConfig()`, and reads `EXPO_PUBLIC_API_BASE_URL` so `@abacusflow/core` does not fall back to default `apiBaseUrl: "/api"`.
- Shared API client now supports dynamic `Configuration.basePath`, so mobile can safely configure the base URL at runtime as long as it calls `setAppConfig()`.
- Product/customer/supplier/depot add/edit flows use the shared `FormScreen` and are mostly present.
- Purchase/sale order add flows use `OrderFormScreen`; purchase now selects products and sale now selects selectable inventory units.
- React Native UX guidance from `ui-ux-pro-max`: prefer semantic roles, clear loading/error feedback, and sufficiently large touch targets; existing app still uses many `TouchableOpacity` instances, but this task will focus on functional release blockers.
- `app.json` identifiers were fixed to `abacusflow-mobile` with scheme `abacusflow`, iOS bundle ID `cn.abacusflow.mobile`, and Android package `cn.abacusflow.mobile`.
- EAS release preparation now exists in `apps/mobile/eas.json`; preview Android builds output APKs, and production profiles auto-increment versions.
- Expo SDK 54 package versions have been aligned with `npx expo install`; remaining npm audit report is 22 vulnerabilities (18 moderate, 4 high), and no `--force` audit fix was applied.
- Verification completed: `npm run typecheck`, `npm run lint`, `git diff --check`, and `npx expo config --type public` passed from the mobile app.
- OpenAPI generated TypeScript now uses extensionless relative imports instead of `.js` suffixes. This keeps `@abacusflow/core` source-compatible with Expo Metro and Next without custom `.js -> .ts` resolver hooks.
- Compatibility verified after regeneration: mobile Web export, mobile Android export, mobile typecheck/lint, and web `next build` all pass. Web build still reports an existing `react-hooks/exhaustive-deps` warning in `src/components/order-list-page.tsx`.
