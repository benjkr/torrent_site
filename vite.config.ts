import { execSync } from "node:child_process";
import path from "path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

function git(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: "utf8" }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function appVersionFromGit() {
  return {
    tag: git("git describe --tags --abbrev=0", "0.0.0"),
    commit: git("git rev-parse --short HEAD", "unknown"),
  };
}

export default defineConfig(({ mode }) => {
  // Load all env keys (not only VITE_*) into process.env for server-side qB config.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  const { tag, commit } = appVersionFromGit();

  return {
    plugins: [reactRouter(), tailwindcss()],
    define: {
      "import.meta.env.VITE_APP_TAG": JSON.stringify(tag),
      "import.meta.env.VITE_APP_COMMIT": JSON.stringify(commit),
    },
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
