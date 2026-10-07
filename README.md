# Family Tree Platform

A full-stack family-history application built with Angular, TypeScript, NestJS, Prisma, and PostgreSQL. It supports family-tree visualisation, member profiles, relationship management, sharing workflows, authentication, and optional third-party integrations.

This public source release contains no production database, uploaded media, user accounts, or deployment credentials.

## Highlights

- Angular 21 application with Signals, reactive forms, route guards, i18n, and Cytoscape graph visualisation
- NestJS 11 API organised by feature modules
- Prisma/PostgreSQL data layer with versioned migrations
- JWT and Google OAuth authentication flows
- Optional Stripe billing, reCAPTCHA, and transactional email integrations
- Unit, integration, and end-to-end test coverage

## Architecture

- `frontend/` — Angular client application
- `backend/` — NestJS API, Prisma schema, migrations, and tests
- `.github/workflows/ci.yml` — install, lint, test, and build checks

Uploaded media is runtime data. Configure `MEDIA_ROOT` outside the repository; it is intentionally ignored by Git.

## Prerequisites

- Node.js 22
- PostgreSQL

## Local setup

### Backend

```bash
cd backend
npm ci
copy .env.example .env
```

Set safe local values in `.env`, then run:

```bash
npm run start:dev
```

Run database migrations against your local database before using the API.

### Frontend

```bash
cd frontend
npm ci
```

For local development, update `src/environments/environment.ts` with your local API URL and optional client-side integration keys. `frontend/.env.example` documents the expected values; Angular environment files are used at build time.

```bash
npm start
```

The default local API URL is `https://example.invalid

## Optional integrations

Stripe, reCAPTCHA, Google OAuth, and Brevo email are disabled until configured. Do not commit real keys, tokens, OAuth credentials, database URLs, or deployment URLs.

For production builds, configure `src/environments/environment.prod.ts` as part of your deployment process. It intentionally contains no production values.

## Quality checks

```bash
# backend
cd backend
npm run lint
npm test
npm run build

# frontend
cd frontend
npm run lint
npm test
npm run build
```

`npm run lint:fix` is available in the backend for local autofixes. CI always uses check-only linting.

## Privacy and assets

This repository intentionally excludes uploaded user media, database data, runtime files, screenshots, and unverified visual/audio assets. The interface uses code-only fallbacks where those assets were removed.

Add replacement assets only when their authorship or license is documented.

## License

No license is included yet. Reuse is not granted until the project owner selects and adds one.
