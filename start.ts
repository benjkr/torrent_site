const api = Bun.spawn(["python", "api/app.py"], {
  stdio: ["inherit", "pipe", "pipe"],
});

const site = Bun.spawn(["bun", "run", "dev"], {
  cwd: "site",
  stdio: ["inherit", "pipe", "pipe"],
});

const prefix = (label: string, stream: ReadableStream<Uint8Array>) =>
  stream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          for (const line of chunk.split("\n")) {
            if (line.trim()) controller.enqueue(`[${label}] ${line}\n`);
          }
        },
      })
    )
    .pipeTo(
      new WritableStream({
        write(chunk) {
          process.stdout.write(chunk);
        },
      })
    );

async function readAll(proc: ReturnType<typeof Bun.spawn>, name: string) {
  prefix(name, proc.stdout);
  prefix(name, proc.stderr);
  return proc.exited;
}

const stop = () => {
  api.kill();
  site.kill();
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await Promise.all([readAll(api, "api"), readAll(site, "site")]);

stop();
