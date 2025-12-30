# Rodostoria Frontend

Angular UI for Rodostoria. It provides the family tree experience, onboarding, member profiles, sharing, subscriptions, and admin tools.

## Highlights

- Interactive family tree visualization
- Family onboarding and relationship management
- Member profiles, stories, favorites, achievements, media
- Global search and sharing requests
- Subscription and account settings
- Contact and support pages
- Multi-language UI

## Tech stack

- Angular 20
- PrimeNG UI and PrimeIcons
- ngx-translate for i18n
- Cytoscape for tree visualization
- Stripe.js for billing

## Setup

```bash
npm install
```

Update `frontend/src/environments/environment.ts`:

```
apiUrl: 'https://example.invalid',
stripePublishableKey: 'REDACTED_CLIENT_KEY',
recaptchaSiteKey: 'your_site_key'
```

## Run

```bash
npm start
```

Navigate to `https://example.invalid

## Build

```bash
npm run build
```

## Tests

```bash
npm run test
```

