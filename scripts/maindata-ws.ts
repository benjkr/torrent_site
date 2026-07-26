import {
  attachMaindataWebSocket,
  MAINDATA_WS_PATH,
  maindataHub,
} from "../app/lib/qb-maindata-hub";

const port = Number(process.env.MAINDATA_WS_PORT) || 3001;

type WsData = {
  cleanup?: () => void;
};

maindataHub.start();

const server = Bun.serve<WsData>({
  port,
  fetch(request, bunServer) {
    const url = new URL(request.url);
    if (url.pathname === MAINDATA_WS_PATH) {
      const upgraded = bunServer.upgrade(request, {
        data: {} as WsData,
      });
      if (upgraded) return undefined as unknown as Response;
      return new Response("Expected WebSocket", { status: 426 });
    }
    return new Response("Maindata WebSocket server", { status: 200 });
  },
  websocket: {
    open(ws) {
      ws.data.cleanup = attachMaindataWebSocket(ws);
    },
    message() {},
    close(ws) {
      ws.data.cleanup?.();
      ws.data.cleanup = undefined;
    },
  },
});

console.log(
  `Maindata WebSocket listening on ws://localhost:${server.port}${MAINDATA_WS_PATH}`,
);
