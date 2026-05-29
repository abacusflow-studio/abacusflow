# Task Plan

## Goal

Audit Web and Mobile forms to verify their required-field validation matches the required fields declared in `openapi.yaml`.

## Phases

1. [complete] Preserve current session context and identify OpenAPI request schemas with required fields.
2. [complete] Inventory Web forms and map each submit payload to its OpenAPI schema.
3. [complete] Inventory Mobile forms and map each submit payload to its OpenAPI schema.
4. [complete] Compare required fields, record mismatches, and distinguish already-fixed local changes from remaining issues.
5. [complete] Report findings with file references and recommended fixes.

## Decisions

- This is an audit/check task unless the user asks for implementation after reviewing findings.
- Treat existing dirty mobile files as user/session work in progress and do not revert them.
- Use `openapi.yaml` as the source of truth for required request fields.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Session catchup detected unsynced mobile required-field fixes | Startup | Record as current context and verify against the actual diff/code instead of assuming clean state. |
