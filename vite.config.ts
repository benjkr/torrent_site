import { execSync } from "node:child_process";
import path from "path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";

function git(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: "utf8" }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function appVersion() {
  return {
    tag:
      process.env.VITE_APP_TAG ||
      git("git describe --tags --abbrev=0", "0.0.0"),
    commit:
      process.env.VITE_APP_COMMIT ||
      git("git rev-parse --short HEAD", "unknown"),
  };
}

/**
 * Glob-hosted `app/dev-pages/*` are not static imports of a route module.
 * When a page is added/removed, force Tailwind's `index.css` module to
 * regenerate so new utilities appear in Vite CSS and React Router critical CSS.
 */
function watchDevPagesForTailwind(): Plugin {
  const indexCss = path.resolve(__dirname, "app/index.css");
  const devPagesDir = path.resolve(__dirname, "app/dev-pages");

  function isDevPagePath(file: string) {
    const normalized = file.replace(/\\/g, "/");
    return normalized.includes("/app/dev-pages/");
  }

  function invalidateIndexCss(server: ViteDevServer, fullReload: boolean) {
    const mods = server.moduleGraph.getModulesByFile(indexCss);
    if (mods) {
      for (const mod of mods) {
        server.moduleGraph.invalidateModule(mod);
      }
    }
    if (fullReload) {
      server.ws.send({ type: "full-reload", path: "*" });
    }
  }

  return {
    name: "watch-dev-pages-for-tailwind",
    configureServer(server) {
      server.watcher.add(devPagesDir);

      server.watcher.on("add", (file) => {
        if (isDevPagePath(file)) invalidateIndexCss(server, true);
      });
      server.watcher.on("unlink", (file) => {
        if (isDevPagePath(file)) invalidateIndexCss(server, true);
      });
      server.watcher.on("change", (file) => {
        if (isDevPagePath(file)) invalidateIndexCss(server, false);
      });
    },
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

  const { tag, commit } = appVersion();

  return {
    plugins: [reactRouter(), tailwindcss(), watchDevPagesForTailwind()],
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
      rolldownOptions: {
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
