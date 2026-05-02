import type { ClientPushFrame, Alert, VitalsSample, Device } from "../../../shared/contracts/types";
import { useAuthStore } from "../auth/store";

type EventType = ClientPushFrame["type"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous listener map
type AnyListener = (data: any) => void;

type DataForType<T extends EventType> = Extract<ClientPushFrame, { type: T }>["data"];

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

class WsClient {
  private socket: WebSocket | null = null;
  private listeners: Map<EventType, Set<AnyListener>> = new Map();
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private intentionallyClosed = false;

  connect(): void {
    const { token } = useAuthStore.getState();
    if (!token) return;

    this.intentionallyClosed = false;
    const wsBase = BASE_URL.replace(/^http/, "ws");
    const url = `${wsBase}/ws/client?token=${encodeURIComponent(token)}`;

    try {
      this.socket = new WebSocket(url);
    } catch (e) {
      console.error("[WS] Failed to create WebSocket:", e);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      console.info("[WS] Connected");
      this.retryCount = 0;
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      let frame: ClientPushFrame;
      try {
        frame = JSON.parse(event.data) as ClientPushFrame;
      } catch {
        console.warn("[WS] Non-JSON message:", event.data);
        return;
      }
      const listeners = this.listeners.get(frame.type);
      if (listeners) {
        listeners.forEach((cb) => cb(frame.data));
      }
    };

    this.socket.onerror = (event) => {
      console.error("[WS] Error:", event);
    };

    this.socket.onclose = () => {
      console.info("[WS] Closed");
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.retryCount, 30_000);
    this.retryCount++;
    console.info(`[WS] Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
    this.retryTimeout = setTimeout(() => this.connect(), delay);
  }

  on<T extends EventType>(type: T, listener: (data: DataForType<T>) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as AnyListener);
    return () => this.off(type, listener);
  }

  off<T extends EventType>(type: T, listener: (data: DataForType<T>) => void): void {
    this.listeners.get(type)?.delete(listener as AnyListener);
  }
}

export const wsClient = new WsClient();

// Re-export data types for convenience
export type { Alert, VitalsSample, Device };
