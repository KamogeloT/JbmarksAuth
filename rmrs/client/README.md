# RMRS Client - Angular 17+ SPA

Records Management & Registry System frontend application built with Angular 17+ using standalone components architecture.

## Architecture

- **No NgModules** — purely standalone component architecture
- **Signals** — Angular signals for reactive state management
- **Lazy Loading** — each feature module loaded on demand via route-based code splitting
- **HTTP Interceptors** — functional interceptors for auth token injection and global error handling

## Project Structure

```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   ├── auth/               # AuthService, auth interceptor, error interceptor
│   ├── api/                # Base API service for HTTP communication
│   └── layout/             # Shell, header, sidebar components
├── shared/                 # Shared components, pipes, models
│   ├── components/         # Reusable UI components
│   ├── models/             # TypeScript interfaces/types
│   └── pipes/              # Custom pipes
├── features/               # Lazy-loaded feature modules
│   ├── dashboard/          # Role-based dashboards
│   ├── file-plan/          # File plan tree management
│   ├── registry/           # Record registration
│   ├── documents/          # Document upload/versioning
│   ├── physical-records/   # Barcode scanning, location tracking
│   ├── disposal/           # Retention & disposal workflow
│   ├── archive/            # Archive transfer
│   ├── search/             # Full-text search
│   ├── reports/            # Report generation
│   ├── audit/              # Audit log viewer
│   ├── security/           # Role management
│   └── admin/              # System configuration
├── app.config.ts           # Application providers (standalone bootstrap)
├── app.routes.ts           # Root routing with lazy loading
└── app.component.ts        # Root component
```

## Setup

```bash
cd client
npm install
ng serve
```

## Build

```bash
ng build --configuration production
```

## Key Design Decisions

1. **Standalone Components**: No NgModules anywhere — uses `bootstrapApplication()` with `ApplicationConfig`
2. **Functional Interceptors**: Uses Angular 17+ `HttpInterceptorFn` pattern instead of class-based interceptors
3. **Environment-based API URL**: Configured via `environment.ts` / `environment.production.ts`
4. **Session-based Auth**: Uses `withCredentials: true` to pass HttpOnly session cookies to the API
5. **Path Aliases**: `@core/*`, `@shared/*`, `@features/*`, `@env/*` for clean imports
