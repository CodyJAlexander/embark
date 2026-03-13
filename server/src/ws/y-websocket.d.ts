declare module 'y-websocket/bin/utils' {
  import type { WebSocket } from 'ws';
  import type { IncomingMessage } from 'http';
  export function setupWSConnection(
    ws: WebSocket,
    req: IncomingMessage,
    opts?: { gc?: boolean; persistence?: unknown }
  ): void;
}
