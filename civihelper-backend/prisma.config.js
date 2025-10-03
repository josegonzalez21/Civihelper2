// prisma.config.js (ESM)
import "dotenv/config";           // <-- Carga .env
import { defineConfig } from "prisma/config";
import path from "node:path";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  seed: "node prisma/seed.js",
});
