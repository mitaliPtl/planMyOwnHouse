import "server-only";
import { z } from "zod";

/**
 * Validated process.env — throws at boot if anything required is missing/malformed,
 * rather than failing confusingly deep inside a request handler. Import this instead
 * of reading `process.env` directly anywhere in server code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("planMyOwnHouse <no-reply@planmyownhouse.local>"),
  RESEND_API_KEY: z.string().optional(),

  RATE_LIMIT_PROVIDER: z.enum(["memory", "upstash"]).default("memory"),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Inert placeholders for the Phase 4+ storage stub — not read by anything yet.
  STORAGE_PROVIDER: z.enum(["minio", "s3"]).default("minio"),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — see console output above.");
}

export const env = parsed.data;
