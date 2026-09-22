# Roadmap & MVP plan

Goal: reach a **working, self-hostable abandoned-cart + welcome-flow tool** that a
real Shopify store can install — then launch publicly to start building the audience
that feeds the paid Cloud tier.

## The wedge (do NOT scope-creep past this)

The single most valuable automation in e-commerce email is the **abandoned cart flow**.
It's the feature with the clearest ROI and the easiest "before we even launched, this
made $X" story. Build that end-to-end first. Everything else waits.

---

## Phase 0 — Validate before heavy building (Week 1)

Before writing flow logic, confirm demand cheaply. Full-time doesn't mean skip this.

- [ ] Landing page: "Open-source Klaviyo alternative for Shopify — self-host your email flows." Email signup.
- [ ] Post the idea in: r/shopify, r/selfhosted, Indie Hackers, relevant Discords.
- [ ] Talk to 5 real Shopify merchants about their email costs & pain.
- [ ] Target: 50+ email signups OR 5 merchants saying "I'd use/pay for this."

## Phase 1 — Foundation (Week 1–2)

- [ ] `./setup.sh` scaffolds Next.js + TS + Prisma + Tailwind
- [ ] Data model migrated (see `prisma/schema.prisma`)
- [ ] Shopify OAuth install flow (public app in dev mode)
- [ ] Store record created on install; API token stored securely
- [ ] Webhook subscriptions: `carts/update`, `orders/create`, `customers/create`

## Phase 2 — The abandoned cart flow (Week 2–4) ⭐

- [ ] Ingest cart events → `Contact` + `CartEvent`
- [ ] Detect abandonment (cart with no order after N hours)
- [ ] BullMQ delayed job schedules the flow steps (e.g. +1h, +24h, +72h)
- [ ] MJML email template with product images from the cart
- [ ] Send via pluggable provider (SMTP first)
- [ ] Suppress if order completed / unsubscribed
- [ ] Basic tracking: sent, opened, clicked, recovered
- [ ] Dashboard: flow status, revenue recovered

## Phase 3 — Make it real for one store (Week 4–6)

- [ ] Welcome series + post-purchase flows (reuse the flow engine)
- [ ] Simple segmentation (total spend, order count, tags)
- [ ] Visual-ish flow editor (start with config, not drag-and-drop)
- [ ] Get it running on ONE real merchant's store (design partner)
- [ ] Deployment guide: Docker Compose one-liner

## Phase 4 — Public launch (Week 6–8)

- [ ] Polished README, demo GIF, docs site
- [ ] `docker compose up` works cleanly for a stranger
- [ ] Launch: Product Hunt, Hacker News ("Show HN"), r/shopify, r/selfhosted
- [ ] GitHub Sponsors + waitlist for **Flowmail Cloud**

## Phase 5 — Monetize (Month 3+)

- [ ] Flowmail Cloud: managed instance, one-click connect, we handle deliverability
- [ ] Billing (Stripe), usage tiers
- [ ] First paying customers

---

## Guardrails

- Ship the abandoned-cart flow working end-to-end before ANY other feature.
- Every week: is a real merchant closer to using this? If not, refocus.
- Open code = marketing. Revenue = Cloud + support. Don't expect donations to pay rent.
