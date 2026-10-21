// env.ts validates on import, so tests load this first to provide a minimal env.
Object.assign(process.env, {
  DATABASE_URL: "postgresql://localhost/test",
  REDIS_URL: "redis://localhost:6379",
  SHOPIFY_API_KEY: "key",
  SHOPIFY_API_SECRET: "hush",
  SHOPIFY_SCOPES: "read_orders",
  SHOPIFY_APP_URL: "https://app.example.com",
  SMTP_HOST: "localhost",
  EMAIL_FROM: "test@example.com",
  APP_SECRET: "x".repeat(32),
});
