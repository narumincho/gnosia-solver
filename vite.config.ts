import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig(() => {
  return {
    plugins: [preact()],
    define: {
      "import.meta.env.VITE_COMMIT_HASH": JSON.stringify(
        Deno.env.get("GITHUB_SHA"),
      ),
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
