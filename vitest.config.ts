import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["mcp/**/*.test.ts", "src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
