import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("DATABASE_URL is required in production; ensure the database is provisioned");
  } else {
    // In development/demo mode we prefer a warning so the app can run without a provisioned DB
    console.warn("DATABASE_URL is not set — running in development/demo mode");
  }
}

const baseConfig = {
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
} as const;

const config = process.env.DATABASE_URL
  ? { ...baseConfig, dbCredentials: { url: process.env.DATABASE_URL } }
  : baseConfig;

export default defineConfig(config as any);
