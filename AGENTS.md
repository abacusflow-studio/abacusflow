# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

AbacusFlow is an inventory management platform organized around DDD and Clean Architecture. The main domains are product, inventory, transaction, partner, depot/storage point, user, and feedback.

The backend is a Kotlin/Java Spring Boot multi-module Gradle project. The frontend lives in `abacusflow-apps/` as an npm workspace containing a Next.js web app, Expo mobile app, Electron desktop app, and shared packages.

## Repository Layout

- `abacusflow-infra/`: infrastructure modules such as DB, storage, and commons.
- `abacusflow-core/`: domain model and business logic modules.
- `abacusflow-usecase/`: application/use case services.
- `abacusflow-portal/abacusflow-portal-web/`: REST API and OpenAPI resources.
- `abacusflow-server/`: Spring Boot application entry point.
- `abacusflow-tools/`: supporting tools and monitoring.
- `abacusflow-apps/apps/web/`: Next.js 15 + React 19 admin web app.
- `abacusflow-apps/apps/mobile/`: Expo React Native mobile app.
- `abacusflow-apps/apps/desktop/`: Electron desktop wrapper.
- `abacusflow-apps/packages/`: shared config, core API client/types, utils, and UI packages.
- `openspec/`: OpenSpec changes and local proposal workflow.
- `docs/`: project planning and implementation documents.

## Common Commands

Backend:

```bash
./gradlew build
./gradlew test
./gradlew :abacusflow-server:bootRun
./gradlew :abacusflow-server:bootJar -PnoVersion
./gradlew installGitHooks
```

Frontend workspace:

```bash
cd abacusflow-apps
npm install
npm run lint
npm run test
npm run build
```

Web:

```bash
cd abacusflow-apps/apps/web
npm run dev
npm run build
npm run lint
```

Mobile:

```bash
cd abacusflow-apps/apps/mobile
npm run start
npm run typecheck
npm run lint
npm run eas:preview:android
```

## Development Notes

- Prefer the existing module boundaries and DDD layering. Domain logic belongs in core modules, orchestration in usecase modules, API exposure in portal modules, and boot wiring in `abacusflow-server`.
- Frontend API access should go through shared packages, especially `@abacusflow/core`, rather than app-local duplicated clients.
- Mobile uses Expo Router via `expo-router/entry`.
- Mobile runtime configuration reads public Expo env values such as `EXPO_PUBLIC_API_BASE_URL`; keep auth and storage behavior compatible with native and web builds.
- OpenAPI-driven client generation is part of the workflow. When backend API contracts change, regenerate and verify consumers in `abacusflow-apps`.
- Keep `.github` workflow changes scoped. Existing workflows separate backend release/deploy, PR CI, and mobile preview behavior.
- Do not apply broad `npm audit --force` dependency rewrites unless explicitly requested; this repo has previously avoided breaking audit fixes.

## Verification

Choose the smallest useful verification set for the change:

- Backend/domain changes: `./gradlew test` or targeted module tests, then `./gradlew build` when the blast radius is broad.
- Web changes: `cd abacusflow-apps && npm run lint:web` and/or `npm run build:web`.
- Mobile changes: `cd abacusflow-apps/apps/mobile && npm run typecheck && npm run lint`.
- Shared frontend package changes: run the relevant workspace lint/test/build commands from `abacusflow-apps`.
- Always run `git diff --check` before finishing edits.

## Local State Caution

This repository may contain user work in progress. Before editing, check `git status --short --branch`. Do not revert or overwrite unrelated local changes.

