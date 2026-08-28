import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./core/runtime/drizzle",
  schema: "./core/runtime/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
