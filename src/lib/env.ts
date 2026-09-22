import { z } from "zod";

/**
 * Central, validated environment config. Import `env` everywhere instead of
 * reading process.env directly — this fails fast at boot if something is missing
 * or malformed, and keeps secrets in one auditable place.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().min(1),
  SHOPIFY_APP_URL: z.string().url(),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  EMAIL_FROM: z.string().email(),

  // Must be a long random string; used to derive encryption + signing keys.
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Parse once at module load. Throws with a readable error if invalid.
export const env = schema.parse(process.env);

export type Env = z.infer<typeof schema>;
