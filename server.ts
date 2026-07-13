import { createRequestHandler } from "react-router";

const build = await import("./build/server/index.js");
const requestHandler = createRequestHandler(build);

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const staticPath = `./build/client${url.pathname}`;
    const file = Bun.file(staticPath);
    if (await file.exists()) {
      return new Response(file);
    }
    return requestHandler(request);
  },
});

console.log(`Server running on http://localhost:${server.port}`);
