# Contributing to StellFlow Backend

Thanks for your interest. This document covers how to set up the project,
the workflow we use, and what we expect from a pull request.

## Prerequisites

- **Node.js 20+** and npm (the CI runs Node 20; `package.json` sets
  `engines.node >= 20`)
- **PostgreSQL 14+** for running the server locally. The test suite does
  **not** need a database — it mocks the Prisma client — so you can run
  every check without one.

## Clone and test

```bash
git clone https://github.com/Steller-Flow/stellflow-backend.git
cd stellflow-backend
npm ci
npx prisma generate
npm test
```

You should see 11 files / 125 tests pass. (Some `Failed to write audit log`
lines on stderr are expected until #49 lands — they are not failures.)

To run the server itself, follow the [Setup](README.md#setup) section of the
README: copy `.env.example` to `.env`, set `DATABASE_URL`, `JWT_SECRET` and
`JWT_REFRESH_SECRET`, create the database, and `npm run dev`.

## Workflow

1. **Comment on the issue first.** Say you'd like to take it and, for anything
   non-trivial, outline your approach. This avoids duplicate work and lets us
   catch design problems early. If there's no issue for what you want to
   change, open one.
2. **Branch** from `main`: `git checkout -b fix/short-description` or
   `feat/short-description`.
3. **Make your change** with focused commits and descriptive messages.
4. **Run the local checks** (below) until they all pass.
5. **Open a pull request** against `main`. Put `Closes #N` in the description
   so the issue is linked and closed on merge.

## Local checks

Run these from the repo root before opening a PR. CI runs the same commands
in the same order and will reject a PR that fails any of them.

```bash
npm ci
npx prisma generate
npm run typecheck     # tsc --noEmit — strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
npm run lint          # eslint src/
npm test              # vitest run
npm run build         # tsc → dist/
```

If you change `prisma/schema.prisma`, also run `npx prisma migrate dev --name
<what-changed>` against a local database and commit the generated
`prisma/migrations/<timestamp>_<name>/` directory. Do not edit a migration
that is already on `main`.

## Pull request expectations

- **One issue per PR.** Keep unrelated changes out; open a second PR instead.
- **New behaviour needs a test.** Controller changes go with a test in
  `src/__tests__/integration/<resource>.test.ts`; middleware, services and
  utilities in `src/__tests__/unit/`. If the file for your resource doesn't
  exist yet, create it.
- **Test through HTTP when the change touches routing or middleware.**
  `src/__tests__/integration/http.test.ts` mounts the real app from
  `src/app.ts` on an ephemeral port and uses `fetch`; add cases there for
  anything that only shows up once a request goes through Express.
- **Match the existing test style.** `src/__tests__/setup.ts` mocks
  `../config/prisma.js` and `../services/stellar.service.js` globally.
  Controller tests build a fake `req` (with `req.user` set for authenticated
  routes) and a `res` with `vi.fn()` for `status`/`json`, arrange the Prisma
  mocks with `vi.mocked(prisma.x.y).mockResolvedValue(...)`, call the
  handler directly, and assert on `res.json` or the thrown `AppError`
  subclass. See `src/__tests__/integration/escrow.test.ts` for the pattern.
  If your test needs a Prisma model or method the mock lacks, add it to
  `setup.ts`.
- **Validate at the edge.** New request bodies and query strings get a zod
  schema in `src/validators/` and `validate(schema, source)` on the route.
  Don't read unvalidated `req.body` in a controller.
- **Throw `AppError` subclasses** (`src/utils/AppError.ts`) rather than
  writing error responses by hand; the error handler formats them.
- **Document the route.** Every new or changed endpoint needs its `@openapi`
  JSDoc block in `src/routes/*.ts` updated, and a row in the README endpoint
  table.
- **Don't change application logic in a docs or CI PR**, and vice versa.
- **Never commit secrets.** `.env` is git-ignored; if you add a variable,
  add it to `.env.example` with a blank or dummy value and to the README
  table.
- **Review target: 48 hours.** A maintainer aims to leave a first review
  within two days of the PR being opened. Please don't force-push over a
  reviewed commit; push follow-up commits instead so the review history stays
  readable.

## Security issues

Do **not** open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md)
for how to report privately.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
