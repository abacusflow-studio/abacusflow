# Task Plan

## Goal

Rebuild the Web app under `abacusflow-apps/apps/web` by using `abacusflow-app/abacusflow-webapp` as the functional reference: identify what each screen requests, how responses are combined for display, then implement the web-first version in the apps workspace.

## Phases

1. [complete] Inventory the reference webapp routes, pages, API calls, and response composition patterns.
2. [complete] Compare the current `apps/web` and shared packages against the reference behavior.
3. [complete] Implement the missing web screens/data wiring with the existing apps workspace conventions.
4. [complete] Verify lint/type/build behavior and record any backend/runtime assumptions.

## Decisions

- Prefer the existing `abacusflow-apps` stack and shared packages over introducing a second framework.
- Evaluate Ant Design only after checking current dependencies and UI conventions; do not add it unless the implementation benefits enough to justify the dependency.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Previous session catchup reported an older `DataTable` runtime issue | Startup | `git status` and `git diff --stat` are clean, so continue without reverting anything. |
| Shared API client used stale HTTP verbs for inventory/order actions | OpenAPI comparison | Updated the shared API client to use the backend's `POST` action endpoints. |
| Inventory page conditional `DataTable` render produced a generic type mismatch | TypeScript check | Split the inventory summary and inventory-unit table renders into separate branches. |
