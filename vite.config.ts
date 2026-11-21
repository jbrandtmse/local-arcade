import { defineConfig } from "vite";

// Single static-site root at the repo root; core/main.ts is the only entry.
export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
