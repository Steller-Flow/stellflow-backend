# Security Policy

## Status

**The StellFlow backend is unaudited, pre-alpha, and has no production
deployment. Do not run it against real user data or real funds.**

No third-party security review has been performed. Several authorization and
verification gaps are already known and tracked publicly — see the
[Known issues](README.md#known-issues) section of the README — because they
were found by the maintainers rather than reported by a third party. New
findings should go through the private channel below.

## Reporting a vulnerability

Please report security issues **privately** by email to
**ojukwulevichinedu@gmail.com**. Do not open a public GitHub issue, discussion,
or pull request for a security problem.

Include as much of the following as you can:

- A description of the issue and its impact
- The affected route(s) and handler(s) in `src/routes/` / `src/controllers/`
- Steps or a request sequence that reproduces it (a failing test under
  `src/__tests__/` is ideal)
- Any suggested fix

You will receive an acknowledgement, and we will work with you on a fix and
disclosure timeline before anything is published.

## Scope

### In scope

- **Authorization bypass** — any path that lets a user read or modify another
  user's invoices, escrows, payments, notifications, audit logs, or profile,
  or perform an admin-only action
- **Authentication weaknesses** — token forgery, refresh-token misuse, lockout
  or rate-limit bypass that enables credential brute force
- **Identity spoofing** — linking a Stellar wallet address the caller does not
  control, or otherwise attaching another party's on-chain identity to an
  account
- **State-integrity bugs** — marking a payment or escrow as funded, released,
  or refunded without the corresponding on-chain event, or leaving records in
  an inconsistent state that misrepresents money movement
- **Injection** — SQL through Prisma raw queries, stored XSS through fields
  that bypass sanitization, header or log injection
- **Secrets exposure** — anything that leaks JWT secrets, database
  credentials, or S3 keys through responses, logs, or error messages

### Out of scope

- Denial of service by volume alone (rate limits are known to be incomplete,
  see #48)
- Issues that require a compromised Stellar validator set or Horizon instance
- Vulnerabilities in third-party dependencies with no demonstrated impact on
  this service (`npm audit` output on its own is not a report)
- Findings on a local or test deployment that hold no real data

## Supported versions

Only the `main` branch is supported. There are no tagged releases yet.
