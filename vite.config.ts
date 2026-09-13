import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { execSync } from "node:child_process";

const getCommitHash = (): string => {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }
  if (process.env.CF_PAGES_COMMIT_SHA) {
    return process.env.CF_PAGES_COMMIT_SHA;
  }
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "main";
  }
};

export default defineConfig({
  plugins: [preact()],
  define: {
    "import.meta.env.VITE_COMMIT_HASH": JSON.stringify(getCommitHash()),
  },
  server: {
    port: 5173,
    host: true,
  },
});
