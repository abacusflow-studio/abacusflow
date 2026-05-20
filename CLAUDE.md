# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AbacusFlow is an inventory management platform built with Domain-Driven Design (DDD) and Clean Architecture principles. The system is organized into five core domains: Product, Inventory, Transaction, Partner, and Storage Point (Depot).

## Architecture

### Backend (Kotlin/Java - Spring Boot)
The project follows Clean Architecture with DDD:

- **Infrastructure Layer (`abacusflow-infra/`)**: Database access and common utilities
  - `abacusflow-db`: Database configurations and entities
  - `abacusflow-commons`: Shared utilities and common code
  
- **Core Domain Layer (`abacusflow-core/`)**: Business logic and domain models
  - `abacusflow-user`: User domain
  - `abacusflow-product`: Product domain
  - `abacusflow-inventory`: Inventory management domain
  - `abacusflow-transaction`: Transaction/ordering domain
  - `abacusflow-partner`: Partner (customers/suppliers) domain
  - `abacusflow-depot`: Storage point/warehouse domain

- **Use Case Layer (`abacusflow-usecase/`)**: Application services and business rules
  - Corresponding usecase modules for each domain
  - `abacusflow-usecase-commons`: Shared use case utilities

- **Portal Layer (`abacusflow-portal/`)**: API interfaces and web controllers
  - `abacusflow-portal-web`: REST API endpoints and OpenAPI spec

- **Tools Layer (`abacusflow-tools/`)**: Supporting tools and monitoring
  - `abacusflow-monitor`: Application monitoring

- **Server Layer (`abacusflow-server/`)**: Main Spring Boot application startup

### Frontend Applications (`abacusflow-apps/`)
Monorepo-based client applications (npm workspaces):
- **`apps/web`**: Next.js 15 + React 19 web application (Admin SPA)
- **`apps/mobile`**: Expo (React Native) mobile app for iOS/Android
- **`apps/desktop`**: Electron desktop application (loads web app static export)
- **`packages/config`**: App configuration (env vars, version, announcements)
- **`packages/utils`**: Pure utility functions (formatting, translations, timestamps)
- **`packages/core`**: API client, auth service, TypeScript types (framework-agnostic)
- **`packages/ui`**: Shared React UI components (DataTable, Button, PageHeader, StatusTag)

## Key Commands

### Backend Development
```bash
# Build entire project
./gradlew build

# Run Spring Boot application
./gradlew :abacusflow-server:bootRun

# Build without version in jar name
./gradlew :abacusflow-server:bootJar -PnoVersion

# Install Git hooks for formatting
./gradlew installGitHooks

# Clean and rebuild
./gradlew clean build
```

### Frontend Applications
```bash
# Install all dependencies (from repo root)
cd abacusflow-apps && npm install

# Web Application (Next.js)
cd abacusflow-apps/apps/web
npm run dev                # Development server
npm run build             # Production build
npm run lint              # ESLint

# Mobile Application (Expo)
cd abacusflow-apps/apps/mobile
npx expo start            # Development
npx expo start --android  # Android
npx expo start --ios      # iOS

# Desktop Application (Electron)
cd abacusflow-apps/apps/desktop
npm start                 # Launch Electron app
```

## Development Workflow

### OpenAPI Client Generation
- Backend generates OpenAPI spec at `abacusflow-portal/abacusflow-portal-web/src/main/resources/static/openapi.yaml`
- Frontend clients consume the API via shared `@abacusflow/core` package

### Code Formatting
- Pre-push Git hook enforces code formatting
- Install with `./gradlew installGitHooks`

### Docker Development
- Use `docker-compose-base.yml` and `docker-compose-prod.yml` for environment setup
- Web app includes Docker support via Gradle tasks

## Testing and Quality

### Running Tests
```bash
# Backend tests
./gradlew test

# Frontend lint
cd abacusflow-apps && npm run lint
```

## Key Technologies

### Backend Stack
- **Framework**: Spring Boot with Kotlin/Java
- **Build**: Gradle with Kotlin DSL
- **Architecture**: DDD + Clean Architecture
- **API**: OpenAPI/Swagger documentation

### Frontend Stack
- **Web**: Next.js 15, React 19, TypeScript
- **Mobile**: Expo (React Native), TypeScript
- **Desktop**: Electron
- **Shared**: Monorepo with npm workspaces, shared packages (`@abacusflow/core`, `@abacusflow/ui`, `@abacusflow/utils`)

### Development Tools
- Git hooks for code formatting
- OpenAPI code generation
- Docker containerization
- Gradle multi-module builds

## Important Notes

- The system is modularized by business domains following DDD principles
- Each domain has its own core, use case, and potentially portal modules
- OpenAPI specs drive client code generation across platforms
- Pre-push hooks ensure code quality and formatting consistency
- Frontend apps share code via `abacusflow-apps/packages/` monorepo