# Security

## Reporting a vulnerability

Please email security reports privately (do not open a public issue) to the
maintainer. We'll acknowledge within 72 hours.

## Design decisions

- **Access tokens** are encrypted at rest with AES-256-GCM; keys are derived from
  `APP_SECRET` per-purpose (see `src/lib/crypto.ts`).
- **All HMAC comparisons** are timing-safe (`crypto.timingSafeEqual`).
- **Shopify OAuth** verifies HMAC + a shop-bound, signed `state` cookie (CSRF).
- **Webhooks** are HMAC-verified against the raw request body before any work.
- **Shop domains** are validated against `*.myshopify.com` (no SSRF / open redirect).
- **Unsubscribe** links are signed + expiring; GET only shows a confirmation page
  and the mutation happens on POST (RFC 8058), so mail scanners can't auto-unsub.
- **Email templates** escape all dynamic values and restrict URLs to http(s).
- **DB access** goes through Prisma (parameterized; no raw SQL).

## Audit status (initial review — pre-alpha)

Findings from the first internal security review:

| # | Severity | Item | Status |
|---|----------|------|--------|
| 1 | High | Dashboard (`/?shop=`) has no auth — info disclosure | **OPEN** — needs Shopify session-token / embedded-app auth before launch |
| 2 | High | Unsubscribe mutated state on GET | Fixed (POST + confirmation) |
| 3 | Medium | No rate limiting | Fixed on `/api/auth`, `/api/unsubscribe` (add to more as needed) |
| 4 | Medium | Missing security headers / CSP | Fixed (`next.config.mjs`) |
| 5 | Medium | Email URLs not scheme-validated | Fixed (`safeUrl`) |
| 6 | Low | OAuth HMAC compares decoded params; `host` (base64) may break valid checks | **TODO** — verify against raw querystring |
| 7 | Low | No webhook dedupe by `X-Shopify-Webhook-Id` | Accepted (handlers are idempotent) |
| 8 | High | nodemailer CVEs (SMTP injection, domain-validation bypass, DoS) | Fixed — upgraded to nodemailer 10.x |
| 9 | Med | postcss advisories (build toolchain) | Fixed — upgraded to postcss 8.5.28 |
| 10 | High×35 | `html-minifier@4.0.0` REDoS, transitive via `mjml` | **Accepted / tracked** — no upstream fix (unmaintained); not exploitable here (we only render our own templates, never attacker-supplied MJML/HTML). Plan: migrate email rendering off `mjml`. |

## Dependency audit (last run: initial review)

`npm audit`: 36 findings remain, of which **35 are the single `html-minifier`
REDoS pulled in by `mjml`** (build/render-time, no attacker-controlled input in
our flow, no upstream patch available). `next build` and `tsc --noEmit` both pass.

## Must-do before any production/public launch

- [ ] Add real dashboard authentication (Shopify session tokens / embedded app).
- [ ] Verify OAuth HMAC against the raw querystring (finding #6).
- [ ] Migrate email rendering off `mjml` (or add an `overrides` for html-minifier)
      to clear the transitive REDoS advisories.
- [ ] Enable Dependabot; keep `package-lock.json` committed.
- [ ] Rotate `APP_SECRET` handling into a proper secret manager in prod.
- [ ] Add integration tests for HMAC verification and suppression logic.
