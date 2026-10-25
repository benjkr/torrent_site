import path from "path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load all env keys (not only VITE_*) into process.env for server-side qB config.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [reactRouter(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./app"),
      },
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === "EMPTY_BUNDLE") return;
          warn(warning);
        },
      },
    },
    server: {
      port: 3000,
      open: false,
    },
  };
});
