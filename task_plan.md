# Task Plan

## Goal

Bring `abacusflow-apps/apps/mobile` from demo-state to a shippable first app build: real backend configuration, real Auth0/OIDC login, usable core data-entry flows, and Expo/EAS release preparation.

## Phases

1. [complete] Audit mobile app startup, auth, API configuration, data-entry screens, and release config.
2. [complete] Implement mobile app configuration and Auth0/OIDC login with token storage, logout, and `/me/bootstrap`.
3. [complete] Repair the highest-impact data-entry flows for purchase/sale orders and basic master-data forms.
4. [complete] Add Expo/EAS release configuration and environment examples for preview/production builds.
5. [complete] Verify lint/type behavior and record remaining release account/manual steps.

## Decisions

- Keep the existing Expo Router + shared package architecture.
- Prefer small production-ready fixes over a full visual redesign.
- Use Expo-compatible auth libraries and public `EXPO_PUBLIC_*` config for app build-time values.
- Preserve existing user changes and avoid touching unrelated backend/cloud files unless required by mobile.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Previous planning files described an old web migration | Startup | Reset plan/findings/progress for the mobile app task. |
| Mobile TypeScript failed on stale generated API names and old DTO fields | Typecheck attempt 1 | Updated mobile screens and shared order components to the current OpenAPI client request shapes. |
