import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load environment variables for local development
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    /**
     * Pour Prisma 7, l'URL définie ici est utilisée par la CLI (migration, introspection).
     * On utilise DIRECT_URL (Port 5432) pour permettre les advisory locks sur Supabase.
     */
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
