# Task Plan

## Goal

Make the Mobile component and screen structure understandable, especially the purpose of each `.tsx` feature component.

## Phases

1. [complete] Audit the current Mobile `src` tree and classify every `.tsx` role.
2. [complete] Identify files that need clearer names, local folders, or documentation.
3. [complete] Add a concise structure guide and feature-level maps.
4. [complete] Apply small structural cleanups that do not alter business behavior.
5. [complete] Run focused validation and summarize the final structure.

## Decisions

- Avoid moving route files unless necessary; `src/app` should remain thin Expo Router shells.
- Prefer documenting and grouping existing feature screens before risky business-logic refactors.
- Keep changes scoped to `abacusflow-apps/apps/mobile` plus planning files.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Mobile lint still reports 3 hook dependency warnings in `purchase-entry-screen.tsx` | Validation | Recorded as pre-existing/non-structural warnings; typecheck and lint exit succeeded. |
