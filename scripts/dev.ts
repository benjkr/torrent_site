/**
 * Dev entry: Vite/React Router on :3000 + maindata WebSocket companion on :3001.
 */
const children: ReturnType<typeof Bun.spawn>[] = [];

function spawnChild(cmd: string[], label: string) {
  const child = Bun.spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: process.env,
  });
  children.push(child);
  void child.exited.then((code) => {
    console.error(`[dev] ${label} exited with code ${code}`);
    shutdown(code ?? 1);
  });
  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // already dead
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

spawnChild(
  ["bun", "--env-file=.env.development", "x", "react-router", "dev"],
  "react-router",
);
spawnChild(
  ["bun", "--env-file=.env.development", "run", "./scripts/maindata-ws.ts"],
  "maindata-ws",
);

console.log("[dev] React Router + maindata WebSocket starting…");
