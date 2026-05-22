# Task Plan

## Goal

Diagnose why Web API requests under `/api` return 404 during local verification and fix the routing/configuration gap with a focused change.

## Phases

1. [complete] Trace API URL construction, Next routing, and backend route shape.
2. [complete] Implement the smallest change that sends Web API requests to the backend.
3. [complete] Verify the routing behavior and record remaining runtime assumptions.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Web API requests report 404 / `Request failed` | Initial report | Investigating client base URL and Next proxy handling. |
| `rg` searched missing `abacusflow-configure` path | CORS/security search | Continue with files found under `abacusflow-portal-web`. |
| `npm run build -w abacusflow-web` exits during static export | Verification | Existing `middleware.ts` is incompatible with `output: "export"`; verify dev proxy separately and report this remaining build issue. |
| Web dev server cannot bind `0.0.0.0:3000` in sandbox | Runtime verification | Escalation was rejected by automatic review; continue with config/build checks only. |
