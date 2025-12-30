# FamilyTreeApp

FamilyTreeApp is a full-stack family tree and genealogy platform for building, exploring, and sharing family histories. It includes a rich Angular front end, a NestJS API, and media storage for photos and stories.

## Features

- Interactive family tree visualization with relationship management
- Member profiles with bio, personal info, education, career, achievements, favorites, and stories
- Media gallery and photo uploads for members
- Family onboarding flow to build the initial tree
- Global search across members and profiles
- Sharing requests and privacy controls
- Authentication with email/password and Google OAuth
- Subscription billing with Stripe
- Contact and support forms protected by reCAPTCHA
- Admin dashboard tools
- Multi-language UI via ngx-translate

## Tech stack

- Frontend: Angular 20, PrimeNG, ngx-translate, Cytoscape, Stripe.js
- Backend: NestJS 11, Prisma, PostgreSQL, JWT auth, Google OAuth, Brevo email
- Storage: local media folder configured via `MEDIA_ROOT`

## Repository layout

- `frontend/` Angular application
- `backend/` NestJS API
- `media/` local storage for uploaded files (path is configurable)

## Quick start

### Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL database

### 1) Backend

```bash
cd backend
npm install
```

Create `backend/.env` and set required values (see Configuration). Then:

```bash
npm run start:dev
```

### 2) Frontend

```bash
cd frontend
npm install
```

Update `frontend/src/environments/environment.ts` with your API URL and keys, then:

```bash
npm start
```

The UI runs at `https://example.invalid and connects to the API at `https://example.invalid by default.

## Configuration

### Backend (`backend/.env`)

Required:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `MEDIA_ROOT`
- `FRONTEND_URL`
- `RECAPTCHA_SECRET_KEY`
- `RECAPTCHA_MIN_SCORE`

OAuth and email:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `BREVO_REPLYTO_EMAIL` (optional)
- `BREVO_REPLYTO_NAME` (optional)

Admin:
- `ADMIN_EMAIL` (optional, can be set in `backend/.enf` to keep it out of source control)

### Frontend (`frontend/src/environments/environment.ts`)

- `apiUrl`
- `stripePublishableKey`
- `recaptchaSiteKey`

## Scripts

### Backend

```bash
npm run start
npm run start:dev
npm run build
npm run test
```

### Frontend

```bash
npm start
npm run build
npm run test
```

## Media storage

Uploaded files are stored on disk at the path configured by `MEDIA_ROOT`. Ensure the API process has read/write access to that directory.

## Deployment notes

- Build and serve the frontend separately (static hosting or CDN).
- Configure `FRONTEND_URL` so the API can handle redirects and CORS.
- Provide production-ready database and email provider credentials.

