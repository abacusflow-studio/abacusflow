# Task Plan

## Goal

Create a developer-ready mobile app整改方案 that repositions `abacusflow-apps/apps/mobile` around fast field data entry instead of management, with a clearer visual tone, navigation model, and implementation roadmap.

## Phases

1. [complete] Preserve context from previous mobile stabilization work and current uncommitted scan/data-entry changes.
2. [complete] Audit current mobile navigation, entry screens, scanner flow, and shared UI patterns.
3. [complete] Define target IA/UX: entry-first workflows, simplified tabs, draft/error behavior, and visual direction.
4. [complete] Write a detailed docs整改方案 for developers to implement.
5. [complete] Verify the document exists and record final notes.

## Decisions

- Keep the existing Expo Router + shared package architecture.
- This task produces a plan document only; code changes are limited to docs/planning files unless required for documentation accuracy.
- Reframe the mobile product as an operations data-entry app, not a mobile admin/management console.
- Use Expo-compatible auth libraries and public `EXPO_PUBLIC_*` config for app build-time values.
- Preserve existing user changes and avoid touching unrelated backend/cloud files unless required by mobile.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Previous planning files described an old web migration | Startup | Reset plan/findings/progress for the mobile app task. |
| Mobile TypeScript failed on stale generated API names and old DTO fields | Typecheck attempt 1 | Updated mobile screens and shared order components to the current OpenAPI client request shapes. |
| Session catchup found unsynced scan/barcode work | Startup | Treat it as current context and include scanner/native-module implications in the整改方案. |
| Tried to read a non-existent utils constants file | Audit | Located the active shared color tokens in `packages/ui-tokens/src/theme.ts`. |
