# Codex Instructions

These rules apply to all work in this repository unless a more specific file overrides them.

## Project-Specific Rules (FamilyTree Monorepo)

### Repository Layout

- `frontend/` is Angular 20 + PrimeNG 20.
- `backend/` is NestJS 11 + Prisma 7.
- Do not mix frameworks across folders.

### Frontend (Angular 20)

- Standalone components only. Never generate NgModules.
- Use `inject()` only. No constructor DI.
- Use Signals for component state. Avoid NgRx or external state libraries unless explicitly requested.
- Templates must use `@if`, `@for`, `@switch` (no `*ngIf/*ngFor`).
- Subscriptions must be cleaned up via `takeUntilDestroyed()` or `takeUntil`.
- PrimeNG must be version-compatible with v20 APIs and `@primeng/themes` conventions.
- No hardcoded Bulgarian text; UI text must use `@ngx-translate/core` keys.
- E2E tests must use Playwright (not Cypress).

### Family Tree Visualization

- Use Cytoscape + cytoscape-dagre for graph layout. Do not introduce alternative graph libraries unless explicitly requested.
- Avoid re-initializing Cytoscape instance unnecessarily; update elements/layout efficiently.

### Backend (NestJS 11)

- Prisma is the only DB access layer (no TypeORM).
- DTO validation via `class-validator` + `class-transformer`.
- Authentication uses Passport strategies (local/JWT/Google).
- Tests use Jest.

### Security / Config

- Never hardcode secrets or API keys.
- Use environment variables and a typed config pattern.

## TypeScript Best Practices

- Use strict type checking.
- Prefer type inference when the type is obvious.
- Avoid the `any` type; use `unknown` when type is uncertain.

## Angular Best Practices

- Always use standalone components over NgModules.
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management.
- Implement lazy loading for feature routes.
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead.
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Components

- Keep components small and focused on a single responsibility.
- Use `input()` and `output()` functions instead of decorators.
- Use `computed()` for derived state.
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator.
- Prefer inline templates for small components.
- Prefer Reactive forms instead of Template-driven ones.
- Do NOT use `ngClass`, use `class` bindings instead.
- Do NOT use `ngStyle`, use `style` bindings instead.

## State Management

- Use signals for local component state.
- Use `computed()` for derived state.
- Keep state transformations pure and predictable.
- Do NOT use `mutate` on signals, use `update` or `set` instead.

## Templates

- Keep templates simple and avoid complex logic.
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use the async pipe to handle observables.

## Services

- Design services around a single responsibility.
- Use the `providedIn: 'root'` option for singleton services.
- Use the `inject()` function instead of constructor injection.
