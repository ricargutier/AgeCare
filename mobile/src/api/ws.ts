import type { ClientPushFrame } from '../../../shared/contracts/types';

type Handler = (frame: ClientPushFrame) => void;

let ws: WebSocket | null = null;
let currentToken: string | null = null;
const handlers = new Set<Handler>();

function connect(token: string) {
  if (ws && ws.readyState === WebSocket.OPEN && currentToken === token) return;

  currentToken = token;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  ws = new WebSocket(`${protocol}//${host}/ws/client?token=${encodeURIComponent(token)}`);

  ws.addEventListener("message", (ev: MessageEvent<string>) => {
    try {
      const frame = JSON.parse(ev.data) as ClientPushFrame;
      handlers.forEach((h) => h(frame));
    } catch {
      // ignore malformed frames
    }
  });

  ws.addEventListener("close", () => {
    ws = null;
    // Attempt reconnect after 3s
    setTimeout(() => {
      if (currentToken) connect(currentToken);
    }, 3000);
  });

  ws.addEventListener("error", () => {
    ws?.close();
  });
}

function disconnect() {
  currentToken = null;
  ws?.close();
  ws = null;
}

function subscribe(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export const wsClient = { connect, disconnect, subscribe };
