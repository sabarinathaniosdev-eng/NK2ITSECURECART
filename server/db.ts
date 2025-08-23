import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      "DATABASE_URL must be set in production. Did you forget to provision a database?",
    );
  } else {
    console.warn("DATABASE_URL not set — running in development/demo mode using in-memory/demo storage where applicable.");
  }
}

export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;
export const db = process.env.DATABASE_URL ? drizzle({ client: pool as any, schema }) : undefined;
