# Rodostoria Backend

NestJS API for Rodostoria. It handles authentication, member profiles, family relationships, media, sharing, billing, and admin workflows.

## Key capabilities

- Auth with JWT, email/password, and Google OAuth
- Family member CRUD and relationship management
- Member profiles, media uploads, and stories
- Global search and directory lookups
- Sharing requests and access controls
- Subscription billing with Stripe
- Contact and support messaging via Brevo
- Admin utilities

## Tech stack

- NestJS 11
- Prisma + PostgreSQL
- Passport (JWT, Local, Google)
- Brevo (email)
- Stripe billing

## Setup

```bash
npm install
```

Create a `.env` file in `backend/` with the following keys (values omitted here):

```
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
MEDIA_ROOT=
FRONTEND_URL=
RECAPTCHA_SECRET_KEY=
RECAPTCHA_MIN_SCORE=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
BREVO_REPLYTO_EMAIL=
BREVO_REPLYTO_NAME=
```

Admin access is now database-backed via the `User.isAdmin` boolean column.

## Run

```bash
# development
npm run start:dev

# production build
npm run build
npm run start:prod
```

## Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

