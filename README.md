# LoveTree Limone

Initial GitHub collaboration baseline for importing the Limone UI visual baseline.

## Scope

This repository currently covers the UI source, public assets, package manifest,
lockfile, and project configuration needed for visual baseline review.

Backend services, D1/Drizzle persistence, authentication, and deployment are
explicitly out of scope for this import.

## Local development

Requirements:

- Node.js `>=22.13.0`
- npm `10.x`

Install dependencies and run the available checks with:

```bash
npm ci
npm run lint
npm test
npm run build
```

There is currently no `typecheck` script configured in `package.json`.

## Collaboration

- `main` is the integration baseline.
- UI changes should be made on an issue-linked branch.
- Pull requests must remain Draft until reviewed and explicitly advanced.
- Do not commit secrets, environment files, generated build output, or local dependency directories.
