# Flowmail

> Open-source, Shopify-native email marketing & automation.
> The affordable, self-hostable alternative to Klaviyo.

**Working name — will be rebranded.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![Status: pre-alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)](#roadmap)

---

## Why this exists

Klaviyo is the default for Shopify email, but merchants have two consistent complaints:

1. **Price scales with your list.** The bill climbs as you grow — punishing exactly the stores doing well.
2. **You don't own your data.** Customer data lives on their servers, in the US.

The open-source options don't fill the gap:

- **Listmonk** — great newsletter sender, but no Shopify integration and no e-commerce automations (abandoned cart, etc).
- **Mautic** — powerful but heavy, complex to run, and development has slowed since 2024.

**Flowmail is the missing piece:** the *e-commerce* automations merchants actually pay for — abandoned cart, welcome series, win-back, post-purchase — built Shopify-first, that you can self-host for the cost of an SMTP provider, or use as a hosted cloud service.

## Business model (open-core)

- **Core (this repo, AGPL-3.0)** — free, self-hostable. Full flows, segmentation, templates. This is the growth engine.
- **Flowmail Cloud (paid)** — managed hosting, deliverability, high-volume sending, premium integrations, support. This is the revenue.

## Features (planned)

| Feature | MVP | Later |
|---|---|---|
| Shopify OAuth + store sync (customers, orders) | ✅ | |
| Abandoned cart flow | ✅ | |
| Welcome / post-purchase flows | ✅ | |
| Visual email editor (MJML) | ✅ | |
| Segmentation (spend, orders, tags) | ✅ | |
| Campaign blasts | | ✅ |
| A/B testing | | ✅ |
| SMS / push | | ✅ |
| Meta/Google Ads audience sync | | ✅ (Cloud) |

## Tech stack

- **Next.js + TypeScript** — dashboard & API
- **PostgreSQL + Prisma** — data
- **Redis + BullMQ** — background jobs (flow scheduling, sending)
- **Shopify API** (`@shopify/shopify-api`) — OAuth, webhooks, store data
- **MJML** — responsive email rendering
- **Nodemailer / Resend** — pluggable email delivery

## Quick start

```bash
git clone <this-repo>
cd flowmail
./setup.sh          # bootstraps Next.js app, Prisma, deps
cp .env.example .env # fill in Shopify + DB + SMTP creds
npm run dev
```

See [ROADMAP.md](./ROADMAP.md) for the build plan and [CONTRIBUTING.md](./CONTRIBUTING.md) to get involved.

## License

[AGPL-3.0](./LICENSE) — you can self-host and modify freely; if you offer it as a
network service you must open-source your changes. This protects the project from
being cloned into a closed commercial SaaS while keeping it fully open for users.
