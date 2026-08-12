import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// M2.14F-FIX2 — resolve the `@/…` path alias (tsconfig `paths`) so component-level tests can import
// shared components (e.g. `@/components/banzai/SafeMarkdown`). Node environment (default) is kept — the
// BanzAI render tests use `react-dom/server` static rendering, not a DOM. Existing tests use relative
// imports and are unaffected.
export default defineConfig({
  // Use the automatic JSX runtime (react/jsx-runtime) — same as Next.js — so component render tests
  // don't need a `React` global in scope.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
