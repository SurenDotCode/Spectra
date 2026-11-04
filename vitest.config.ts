import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    maxWorkers: 2,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/security/**/*.ts",
        "src/lib/research/verify.ts",
        "src/lib/csv.ts",
      ],
      reporter: ["text", "json-summary"],
    },
  },
});
