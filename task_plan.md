# Task Plan

## Goal

Create a developer-ready execution plan for user issue collection across Web and Mobile, plus Android APK distribution from the Web via QR/link, including required `.github` workflow updates.

## Phases

1. [complete] Preserve context from previous sessions and confirm current worktree state.
2. [complete] Audit existing `.github` workflows, Web app entry points, Mobile tabs, backend OpenAPI/module structure, and EAS config.
3. [complete] Define feedback collection architecture, Android distribution workflow, and implementation phases.
4. [complete] Write a detailed execution plan in `docs/`.
5. [complete] Verify the document and record final notes.

## Decisions

- Keep the existing Expo Router + shared package architecture.
- This task produces a plan document only; code changes are limited to docs/planning files unless required for documentation accuracy.
- Feedback capture must be available inside both Web and Mobile with the lowest possible friction.
- Android download should use an installable APK for internal/early users, exposed from Web through a QR/link.
- `.github` updates should be scoped and explicit; avoid mixing backend Docker release, Web deploy, and Mobile APK publication into one opaque workflow.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Previous planning files described an old web migration | Startup | Reset plan/findings/progress for the mobile app task. |
| Mobile TypeScript failed on stale generated API names and old DTO fields | Typecheck attempt 1 | Updated mobile screens and shared order components to the current OpenAPI client request shapes. |
| Session catchup found unsynced scan/barcode work | Startup | Treat it as current context and include scanner/native-module implications in the整改方案. |
| Tried to read a non-existent utils constants file | Audit | Located the active shared color tokens in `packages/ui-tokens/src/theme.ts`. |
| Shell failed reading a path containing parentheses | Audit | Re-ran the command with the path quoted. |
