# StellFlow Backend

[![CI](https://github.com/Steller-Flow/stellflow-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Steller-Flow/stellflow-backend/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The REST API for StellFlow, a payroll / invoice / escrow platform for
freelancers and clients that settles in USDC on Stellar. This service owns the
off-chain side: user accounts and JWT sessions, invoices, escrow *records* that
mirror the on-chain [escrow contract](#relationship-to-the-escrow-contract),
payment records keyed by Stellar transaction hash, Stellar wallet linking,
notifications, dashboard analytics, and an audit log. Escrow funds themselves
never touch this service — they live in the Soroban contract.

> **⚠️ Status: pre-alpha, not deployable as-is.** The API is unaudited, has no
> production deployment, and two open bugs currently prevent it from serving
> any request: the Prisma 7 client is constructed without a driver adapter so
> the process exits at startup ([#39](https://github.com/Steller-Flow/stellflow-backend/issues/39)),
> and a global middleware assigns to Express 5's read-only `req.query` so every
> request would 500 once it did boot ([#40](https://github.com/Steller-Flow/stellflow-backend/issues/40)).
> On-chain verification is also stubbed ([#44](https://github.com/Steller-Flow/stellflow-backend/issues/44)).
> The unit and controller test suite passes and CI is green because tests mock
> the database and call controllers directly. See [Known issues](#known-issues).

## API documentation (Swagger)

Every mounted route carries an OpenAPI 3.0 annotation and the spec is served by
the app itself:

| | |
|---|---|
| Swagger UI | **http://localhost:3001/api-docs** |
| Raw spec (JSON) | http://localhost:3001/api-docs.json |

The spec is generated at startup from the `@openapi` JSDoc blocks in
`src/routes/*.ts` by `swagger-jsdoc` (`src/config/swagger.ts`). It currently
documents 34 paths / 42 operations with `bearerAuth` security and shared
`User`, `Invoice`, `Escrow` component schemas. Gaps are tracked in
[#50](https://github.com/Steller-Flow/stellflow-backend/issues/50).

## Stack

| | |
|---|---|
| Runtime | Node.js ≥ 20, TypeScript 6, ES modules |
| HTTP | Express 5, helmet, cors, morgan, cookie-parser, express-rate-limit |
| Data | PostgreSQL via Prisma 7 (`prisma/schema.prisma`) |
| Validation | zod 4 (`src/schemas/`, `src/validators/`), sanitize-html |
| Auth | JWT access tokens (15 min, `Authorization: Bearer`) + refresh tokens (7 days, HTTP-only cookie), bcryptjs |
| Stellar | `stellar-sdk` (declared, not yet used — see #44); Horizon `GET /accounts/:id` for wallet existence checks |
| Realtime | socket.io server with JWT handshake (see [WebSocket events](#websocket-events)) |
| Files | multer + sharp + AWS S3 (routes not yet mounted — see #45) |
| Docs | swagger-jsdoc + swagger-ui-express |
| Tests | vitest |

## Prerequisites

- Node.js 20 or later and npm
- PostgreSQL 14 or later, reachable from your machine
- (Optional) an S3-compatible bucket, only for file uploads

## Setup

```bash
git clone https://github.com/Steller-Flow/stellflow-backend.git
cd stellflow-backend
npm ci
cp .env.example .env
```

Edit `.env`. At minimum set `DATABASE_URL`, `JWT_SECRET`, and
`JWT_REFRESH_SECRET` (generate secrets with `openssl rand -hex 32`). See
[Environment variables](#environment-variables).

### Database

Create the database your `DATABASE_URL` points at, then generate the Prisma
client and apply the schema:

```bash
createdb stellflow                 # or via psql / your GUI
npx prisma generate
```

No migration files are committed yet (`prisma/migrations/` does not exist —
part of #39), so on a fresh database create the initial migration yourself:

```bash
npx prisma migrate dev --name init   # creates prisma/migrations/ and applies it
```

Once migrations are in the repo, `npm run db:migrate` (development) or
`npm run db:deploy` (production, no prompts) apply them.

Optional seed data — five users, five invoices, two escrows and a notification — is in
`prisma/seed.ts`:

```bash
npm run db:seed
```

`npm run db:reset` drops everything, re-applies migrations and re-seeds.
`npm run db:studio` opens Prisma Studio.

### Run

```bash
npm run dev          # tsx watch, restarts on change, http://localhost:3001
npm run build        # tsc → dist/
npm start            # node dist/index.js
```

`GET /health` returns `{ "status": "ok", "timestamp": "..." }`.

## Environment variables

All variables are read in `src/config/index.ts` (`DATABASE_URL` also in
`prisma.config.ts`). `.env.example` has the same list with comments.

| Variable | Required | Default | Used for |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Prisma connection string |
| `JWT_SECRET` | yes | `""` (signing fails) | Access-token signing key |
| `JWT_REFRESH_SECRET` | yes | `""` (signing fails) | Refresh-token signing key; must differ from `JWT_SECRET` |
| `PORT` | no | `3001` | HTTP + WebSocket port |
| `NODE_ENV` | no | `development` | `production` enables `Secure` cookies and hides stack traces in logs |
| `CORS_ORIGIN` | no | `http://localhost:3000` | Single allowed origin for CORS and socket.io |
| `STELLAR_NETWORK` | no | `testnet` | Informational today; will select Horizon/RPC once #44 lands |
| `STELLAR_HORIZON_URL` | no | `https://horizon-testnet.stellar.org` | Wallet existence check before issuing a link challenge |
| `AWS_REGION` | no | `us-east-1` | S3 client |
| `AWS_S3_BUCKET` | no | `stellflow-uploads` | Upload bucket |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | uploads only | `""` | S3 credentials |
| `AWS_S3_ENDPOINT` | no | unset | Custom endpoint (MinIO, LocalStack) |
| `AWS_S3_FORCE_PATH_STYLE` | no | `false` | Set `true` with a custom endpoint |

Token lifetimes (900 s access, 604800 s refresh) are constants in
`src/config/index.ts`, not environment variables.

## Endpoints

All paths are prefixed with `/api` except `/health`, `/api-docs`, and
`/api-docs.json`. **Auth** means a valid access token in
`Authorization: Bearer <token>`; **Admin** additionally requires `role: ADMIN`.
Rate limits are per 15 minutes: 200/IP globally, 100/IP on every `/api/*`
resource except auth, 20/IP on register and refresh, 5/IP+email on login.

Responses are `{ "success": true, "data": { ... } }`; list endpoints add
`data.pagination = { page, limit, total, totalPages }` and accept `?page` and
`?limit` (max 100). Errors are `{ "success": false, "error": { "message", "code" } }`
(with `errors: { field: [messages] }` on validation failures) — the shape is
not yet uniform across every layer, see #47.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create a `FREELANCER` or `CLIENT` account; returns user + tokens, sets refresh cookie |
| POST | `/login` | — | Email + password; returns user + tokens, sets refresh cookie. 5 attempts / 15 min per IP+email |
| POST | `/logout` | — | Clears the refresh cookie |
| POST | `/refresh-token` | cookie or body `refreshToken` | Issues a new access + refresh token pair |
| GET | `/me` | Auth | Current user's profile |

### Users — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profile` | Auth | Full profile with a completeness score |
| PUT | `/profile` | Auth | Update `fullname`, `email`, `country`, `profileImage` (`walletAddress` is also accepted today — see #41) |
| DELETE | `/profile` | Auth | Permanently delete the account |
| POST | `/avatar` | Auth | Set `profileImage` to a URL (not a file upload) |

### Wallet — `/api/wallet`

Challenge–response linking of a Stellar `G...` address to the account.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/challenge` | Auth | Checks the address exists on Horizon and returns a challenge string valid for 5 minutes |
| POST | `/verify` | Auth | Submit `walletAddress`, `challenge`, `signature`; on success stores the address on the user. **The signature is not cryptographically verified yet — #41** |
| POST | `/unlink` | Auth | Remove the linked address |

### Invoices — `/api/invoices`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Auth | Create an invoice addressed to `recipientId`; emits `invoice:sent` to the recipient |
| GET | `/` | Auth | List invoices for the caller (freelancers: created; clients: received; admins: all). Filters: `status`, `search`, `creatorId`, `recipientId` (see #42) |
| GET | `/:id` | Auth | Fetch one (creator, recipient, or admin) |
| PUT | `/:id` | Auth | Update fields / status `DRAFT` → `PENDING` → `CANCELLED`; emits `invoice:statusUpdate` |
| DELETE | `/:id` | Auth | Delete a `DRAFT` invoice |

### Escrows — `/api/escrows`

Mirrors the on-chain escrow lifecycle. Transitions allowed: `PENDING → FUNDED | REFUNDED`,
`FUNDED → RELEASED | REFUNDED | DISPUTED`; `RELEASED`, `REFUNDED`, `DISPUTED` are terminal.
There is no list endpoint yet.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Auth (client or admin) | Create an escrow record for an invoice addressed to you (`invoiceId`, `contractId`); sets invoice to `IN_ESCROW`; emits `escrow:created` |
| GET | `/:id` | Auth | Fetch one (client, freelancer, or admin) |
| POST | `/:id/fund` | Auth (client) | Record funding with `txHash`; escrow → `FUNDED`, invoice → `FUNDED`, creates a `SUCCESS` payment; emits `escrow:funded` |
| POST | `/:id/release` | Auth (freelancer) | Record release with `txHash`; escrow → `RELEASED`, invoice → `COMPLETED`; emits `escrow:released` |
| POST | `/:id/refund` | Admin | Record refund with `txHash`; escrow → `REFUNDED`, invoice → `CANCELLED`; emits `escrow:refunded` |

### Payments — `/api/payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Auth | Record a `PENDING` payment by unique `txHash`, optionally tied to an `escrowId` |
| GET | `/` | Auth | List the caller's payments (admins: all). Filters: `status`, `sortBy`, `sortOrder` |
| GET | `/:id` | Auth | Fetch one (owner or admin) |
| POST | `/verify` | Auth | Mark a payment `SUCCESS`/`FAILED` after checking the transaction on Stellar (**check is stubbed — #44**); emits `payment:confirmed` |
| POST | `/webhook` | Auth | Confirmation callback: `txHash`, `status` (`CONFIRMED`/`FAILED`), `confirmations`, `ledger`. **No signature or ownership check — #43** |

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Auth (self or admin) | Create a notification for `userId`; emits `notification:new` |
| GET | `/` | Auth | List the caller's notifications. Filters: `type`, `isRead` |
| GET | `/unread-count` | Auth | `{ count }` |
| POST | `/mark-read` | Auth | Mark `notificationIds[]` read; emits `notification:read` |
| POST | `/mark-all-read` | Auth | Mark all read; emits `notification:allRead` |
| GET | `/:id` | Auth | Fetch one (owner) |
| DELETE | `/:id` | Auth | Delete one (owner) |

### Analytics — `/api/analytics`

Aggregations over the caller's own invoices, escrows and payments.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/overview` | Auth | Dashboard totals (invoices, escrows, payments, amounts by status) |
| GET | `/monthly-revenue` | Auth | Revenue per month |
| GET | `/transaction-volume` | Auth | Payment count and volume over time |
| GET | `/escrow` | Auth | Escrow counts and amounts by status |
| GET | `/earnings` | Auth | Earnings between `startDate` and `endDate` |

### Audit logs — `/api/audit-logs`

Every mutating handler writes an `AuditLog` row (action, resource, actor, IP, user agent, metadata).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | All logs; filters `userId`, `action`, `resource`, `startDate`, `endDate` |
| GET | `/my` | Auth | Caller's own logs |
| GET | `/:id` | Auth | One log (owner or admin) |

### Uploads — `/api/upload` (not mounted)

`src/routes/upload.routes.ts` defines `POST /avatar`, `POST /invoice/:invoiceId`
and `GET /presigned-url` (multer → sharp resize → S3), but the router is not
registered in `src/index.ts`, so these return 404. Tracked in #45.

## WebSocket events

A socket.io server shares the HTTP port. Connect with the access token in the
handshake (`auth: { token }` or an `Authorization: Bearer` header); unauthenticated
connections are rejected. Each socket joins `user:<userId>` automatically and
may `emit("join:escrow", escrowId)` / `emit("leave:escrow", escrowId)` to
follow an escrow room.

Events the server emits from the controllers listed above:

| Event | Room | Emitted by |
|---|---|---|
| `invoice:sent` | recipient | `POST /invoices` |
| `invoice:statusUpdate` | recipient | `PUT /invoices/:id` |
| `escrow:created` | freelancer | `POST /escrows` |
| `escrow:stateChange` | `escrow:<id>` | fund / release / refund |
| `escrow:funded`, `escrow:released`, `escrow:refunded` | counterparty | fund / release / refund, payment webhook |
| `payment:confirmed` | payer | `POST /payments/verify`, `POST /payments/webhook` |
| `notification:new`, `notification:read`, `notification:allRead` | target user | notification routes |

Caveats, stated plainly: the emits are wired in code but have never been
exercised end-to-end because the server does not currently boot (#39, #40);
there are no tests for the socket layer; rooms are in-process memory, so this
does not work across multiple instances; and there is no client library or
event-payload documentation beyond the source. Treat this as a work-in-progress
feature, not a shipped one.

## Running tests

```bash
npm test             # vitest run — 9 files, 115 tests
npm run test:watch
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src/
```

Tests live in `src/__tests__/`: `unit/` for config, errors, pagination,
sanitize helpers and zod schemas; `integration/` for the auth, invoice and
escrow controllers. `setup.ts` mocks the Prisma client and the Stellar
service, so **no database is needed** and CI does not start one. Payment,
notification, user, wallet, audit and analytics controllers have no tests
yet (#49).

CI (`.github/workflows/ci.yml`) runs `npm ci`, `prisma generate`, typecheck,
lint, test and build on every push and pull request to `main`.

## Relationship to the escrow contract

Escrow funds are held by the Soroban contract in
[Steller-Flow/stellflow-smartcontract](https://github.com/Steller-Flow/stellflow-smartcontract),
deployed on **testnet** at:

```
CA77HTQMZAFBU5GVVFOEHT6AGCOVZJ2MXSEZ33DJJSZWY6NFFPPI67RS
```

([stellar.expert](https://stellar.expert/explorer/testnet/contract/CA77HTQMZAFBU5GVVFOEHT6AGCOVZJ2MXSEZ33DJJSZWY6NFFPPI67RS))

The intended division of labour:

1. The **client's wallet** signs and submits `create_escrow` / `fund_escrow`
   to the contract; the **freelancer's wallet** submits `release`; disputes go
   to the contract admin. The API holds no keys and never submits transactions.
2. The frontend then calls this API (`POST /escrows`, `/escrows/:id/fund`,
   `/release`, `/refund`) with the resulting `contractId` / `txHash`. The API
   records the state, links it to the invoice, writes a payment row and an
   audit entry, and notifies the counterparty.
3. `src/services/stellar.service.ts` is where the API is meant to check the
   submitted `txHash` against Horizon / Soroban RPC and read the escrow's
   on-chain status before trusting it.

**Today, step 3 is a stub**: every function in `stellar.service.ts` returns
success without contacting the network, and `createEscrowContract` fabricates
a `contractId` instead of using the one the client supplies. The `Escrow` and
`Invoice` tables therefore record whatever the caller sends. Making the API
verify against the real contract is #44.

The mapping between contract state and API state:

| Contract status | API `Escrow.status` | API `Invoice.status` |
|---|---|---|
| Pending | `PENDING` | `IN_ESCROW` |
| Funded | `FUNDED` | `FUNDED` |
| Released | `RELEASED` | `COMPLETED` |
| Refunded | `REFUNDED` | `CANCELLED` |
| Disputed | `DISPUTED` | `DISPUTED` |

## Project layout

```
src/
├── index.ts              Express app, middleware order, route mounting, socket init
├── config/               env (index.ts), Prisma client, swagger spec
├── routes/               one router per resource, with @openapi annotations
├── controllers/          request handlers
├── services/             audit log, socket.io, Stellar (stub), S3 uploads, wallet challenges
├── middleware/           auth (JWT), validate (zod), sanitize, rate limiting, error handler
├── schemas/, validators/ zod schemas (two directories for historical reasons)
├── utils/                AppError classes, pagination helpers
└── __tests__/            vitest unit and controller tests
prisma/
├── schema.prisma         User, Invoice, Escrow, Payment, Notification, AuditLog
└── seed.ts
scripts/                  db-migrate.sh, db-deploy.sh, db-reset.sh
```

## Known issues

The full list is on the [issue tracker](https://github.com/Steller-Flow/stellflow-backend/issues).
The ones that matter most before anyone relies on this service:

| # | Area | Summary |
|---|---|---|
| [#39](https://github.com/Steller-Flow/stellflow-backend/issues/39) | startup | `new PrismaClient()` without an adapter — process exits; no migrations committed; no env validation |
| [#40](https://github.com/Steller-Flow/stellflow-backend/issues/40) | startup | assignment to read-only `req.query` — every request 500s |
| [#41](https://github.com/Steller-Flow/stellflow-backend/issues/41) | security | wallet signature never verified; `walletAddress` settable via profile/register |
| [#42](https://github.com/Steller-Flow/stellflow-backend/issues/42) | security | invoice list scope can be overridden by query params |
| [#43](https://github.com/Steller-Flow/stellflow-backend/issues/43) | security | payment webhook / verify lack ownership and authenticity checks |
| [#44](https://github.com/Steller-Flow/stellflow-backend/issues/44) | stellar | no on-chain verification; contract ids fabricated |
| [#46](https://github.com/Steller-Flow/stellflow-backend/issues/46) | data | escrow transitions are not atomic |
| [#48](https://github.com/Steller-Flow/stellflow-backend/issues/48) | security | per-user rate limit never applies; login lockout is dead code |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the local check commands,
and PR expectations. Issues labelled
[`good first issue`](https://github.com/Steller-Flow/stellflow-backend/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
are scoped for newcomers.

To report a vulnerability, see [SECURITY.md](SECURITY.md) — please do not open
a public issue.

## License

[MIT](LICENSE) © 2026 StellFlow
