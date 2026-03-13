import { WebSocketServer, type WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { jwtVerify } from 'jose';
import { setupWSConnection } from 'y-websocket/bin/utils';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-me'
);

export function attachYjsWebSocket(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // setupWSConnection needs the request to extract the room name from the URL path
    setupWSConnection(ws, req, { gc: true });
  });

  httpServer.on('upgrade', async (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    // Only handle upgrades on /yjs/* paths
    if (!url.pathname.startsWith('/yjs/')) {
      socket.destroy();
      return;
    }

    // Validate JWT from ?token= query param
    const token = url.searchParams.get('token');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      await jwtVerify(token, secret);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
}
