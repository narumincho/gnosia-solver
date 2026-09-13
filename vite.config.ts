import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { execSync } from "node:child_process";

const getCommitHash = (): string | undefined => {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }
  if (process.env.CF_PAGES_COMMIT_SHA) {
    return process.env.CF_PAGES_COMMIT_SHA;
  }
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return undefined;
  }
};

export default defineConfig(({ command }) => {
  const commitHash = command === "build" ? getCommitHash() : undefined;

  return {
    plugins: [preact()],
    define: {
      "import.meta.env.VITE_COMMIT_HASH": JSON.stringify(commitHash),
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
