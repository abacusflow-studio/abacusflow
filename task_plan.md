# Task Plan

## Goal

Fix the five reported mobile/web feedback and entry workflow issues without disturbing unrelated user changes.

## Phases

1. [complete] Inspect feedback upload/detail/status code paths on mobile and web.
2. [complete] Inspect mobile purchase/sale partner loading and inline partner creation paths.
3. [complete] Inspect entry home auxiliary action layout after scanner close.
4. [in_progress] Implement focused fixes for confirmed issues.
5. [pending] Run targeted validation and summarize residual risks.

## Decisions

- Keep fixes scoped to feedback, entry partner selection, and scanner/entry UI.
- Preserve existing platform-specific behavior unless the reported issue is web-only.
- Use concise operational UI language for feedback statuses.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
