# Contributing to RMRS

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `dotnet test` (backend) and `ng test` (frontend)
4. Submit a pull request

## Code Standards

### Backend (.NET 8)
- Follow C# coding conventions
- Use async/await for all I/O operations
- All services must implement interfaces
- Use constructor injection for DI
- Write XML documentation for public APIs

### Frontend (Angular 17+)
- Use standalone components (no NgModules)
- Use signals for reactive state
- Lazy-load feature routes
- Follow Angular style guide

### Database
- All schema changes via EF Core migrations
- Never modify audit log tables directly
- Use parameterized queries (no string concatenation)

## Commit Messages

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code refactoring
- `test:` — Tests
- `chore:` — Maintenance

## Architecture Decisions

- All Bitrix API calls go through `IBitrixApiClient`
- Department-to-workgroup mappings are database-driven (no hardcoded values)
- Audit interceptor captures all entity changes automatically
- Background jobs use IHostedService with configurable intervals
