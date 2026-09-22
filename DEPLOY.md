# Deploy

## Fastest path for Phase 0: Vercel + Neon (Postgres) + Upstash (Redis)

All three have free tiers. You'll need to log into each once (accounts are yours —
Claude can't log in for you).

### 1. Database — Neon (free Postgres)
1. Create a project at https://neon.tech
2. Copy the connection string → this is `DATABASE_URL`.

### 2. Redis — Upstash (free)
1. Create a database at https://upstash.com
2. Copy the Redis URL → this is `REDIS_URL`.
   *(For the landing/waitlist alone, Redis is only used for rate limiting and fails
   open — you can defer Upstash until you enable the full flow engine.)*

### 3. App — Vercel
```bash
npm i -g vercel        # if not installed
vercel login           # opens browser — you do this
vercel link            # link this folder to a new Vercel project
```
Set env vars (Vercel dashboard → Project → Settings → Environment Variables), using
the same keys as `.env.example`:
`DATABASE_URL, REDIS_URL, SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_SCOPES,
SHOPIFY_APP_URL (your vercel URL), SMTP_*, EMAIL_FROM, APP_SECRET`.

**Migrations run automatically on deploy.** The `build` script is
`prisma generate && prisma migrate deploy && next build`, and the datasource uses
`directUrl = env("DATABASE_URL_UNPOOLED")` so migrations use Neon's direct
connection while the app uses the pooled one. Just deploy:
```bash
vercel --prod
```
(Neon's connection strings are stored as Sensitive env vars and can't be pulled
via CLI — that's why migrations run inside the build, where the vars are injected.)

Your landing will be live at `https://<project>.vercel.app/waitlist`.
Put that URL into LAUNCH.md and start posting.

### 4. Background worker (only needed for sending, not for the landing)
The BullMQ worker (`npm run worker`) needs a long-running process — Vercel functions
won't run it. Options: Railway / Render / Fly.io / a small VPS running
`npm run worker`. Defer this until after the landing validates demand.

---

## Alternative: everything on one box (Railway or a VPS)
Railway can host the Next app, Postgres, Redis, and the worker together — simpler
mental model, one bill. Good once you move past the landing stage.

---

## Shopify app setup (needed for real store installs, not for the landing)
1. Create an app at https://partners.shopify.com
2. App URL: `https://<your-domain>`
3. Redirect URL: `https://<your-domain>/api/auth/callback`
4. Copy API key/secret into env.
