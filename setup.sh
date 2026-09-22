#!/usr/bin/env bash
# Flowmail bootstrap — creates the Next.js app, installs deps, sets up Prisma.
# Safe to run once on a fresh clone. Idempotent-ish: skips create-next-app if src exists.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Flowmail setup"

if [ ! -d "src/app" ]; then
  echo "==> Scaffolding Next.js app (TypeScript, Tailwind, App Router)..."
  # Scaffold into a temp dir then merge, so our existing files (README, prisma, etc) survive.
  npx --yes create-next-app@latest .flowmail-app \
    --typescript --tailwind --eslint --app --src-dir \
    --import-alias "@/*" --no-turbopack --use-npm
  # Move generated app files in without clobbering our own.
  rsync -a --ignore-existing .flowmail-app/ ./
  rm -rf .flowmail-app
else
  echo "==> Next.js app already present, skipping scaffold."
fi

echo "==> Installing runtime dependencies..."
npm install \
  @prisma/client \
  bullmq ioredis \
  mjml \
  nodemailer \
  zod

echo "==> Installing dev dependencies..."
npm install -D prisma @types/nodemailer @types/mjml

echo "==> Generating Prisma client..."
npx prisma generate || echo "(prisma generate will succeed once DATABASE_URL is set)"

echo ""
echo "==> Done. Next steps:"
echo "    1. cp .env.example .env   # fill in Shopify + DB + SMTP creds"
echo "    2. Start Postgres + Redis (see docker-compose when added)"
echo "    3. npx prisma migrate dev --name init"
echo "    4. npm run dev"
