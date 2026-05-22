# Progress

## 2026-05-22

- Read shared API URL construction, shared config, and Web middleware.
- Started tracing Web `404` reports from `usePaginatedList` through `/api` handling.
- Planning skill session catchup reported an unrelated prior worktree cleanup session.
- Confirmed Web Next config currently has no `/api` proxy despite the shared `/api` default.
- Checked backend OpenAPI and controller structure; backend local routes are rooted at `http://localhost:8080`.
- Checked backend Web/Security configuration and started checking route mismatches beyond the `/api` prefix.
- Compared generated OpenAPI routes with the shared API client and found several old shared resource paths.
- Updated Web dev proxy configuration and shared API paths.
- `npm run lint -w abacusflow-web` passed.
- `npm run build -w abacusflow-web` reached static export and failed because existing middleware is incompatible with static export.
- Tried to start the Web dev server for a live `/api` check; sandbox port binding failed and the escalation request was rejected.
- `git diff --check` and `tsc --noEmit --project apps/web/tsconfig.json` passed.
