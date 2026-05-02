/**
 * WebSocket client for the AgeCare ingest endpoint.
 * Connects to ws://localhost:3000/ws/ingest?deviceToken=<token>
 * and reconnects automatically on close.
 *
 * Reads BACKEND_URL env (default: ws://localhost:3000).
 */

import WebSocket from "ws";

// IngestFrame definition mirrored from shared/contracts/types.ts
// We inline it here so simulators/ can run without a monorepo build step.
export type IngestFrame =
  | { type: "heartbeat"; deviceId: string; payload: { batteryPct?: number } }
  | {
      type: "vitals";
      deviceId: string;
      payload: {
        ts: string;
        heartRate?: number;
        spo2?: number;
        steps?: number;
        batteryPct?: number;
      };
    }
  | {
      type: "fall";
      deviceId: string;
      payload: { ts: string; gForce: number; orientation?: string };
    }
  | { type: "sos"; deviceId: string; payload: { ts: string } }
  | {
      type: "motion";
      deviceId: string;
      payload: { ts: string; room?: string; detected: boolean };
    }
  | {
      type: "door";
      deviceId: string;
      payload: { ts: string; door: string; state: "open" | "closed" };
    }
  | {
      type: "medication_taken";
      deviceId: string;
      payload: { ts: string; scheduleId: string };
    };

const BACKEND_URL = process.env["BACKEND_URL"] ?? "ws://localhost:3000";

export class WsClient {
  private ws: WebSocket | null = null;
  private queue: IngestFrame[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closing = false;

  constructor(private readonly deviceToken: string) {}

  /** Connect (or reconnect) to the ingest endpoint. */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${BACKEND_URL}/ws/ingest?deviceToken=${encodeURIComponent(this.deviceToken)}`;
      console.log(`[ws-client] Connecting to ${url}`);

      const ws = new WebSocket(url);
      this.ws = ws;

      ws.once("open", () => {
        console.log("[ws-client] Connected.");
        // Drain any queued frames
        for (const frame of this.queue) {
          ws.send(JSON.stringify(frame));
        }
        this.queue = [];
        resolve();
      });

      ws.once("error", (err) => {
        console.error("[ws-client] Connection error:", err.message);
        reject(err);
      });

      ws.on("close", () => {
        if (this.closing) return;
        console.warn("[ws-client] Connection closed. Reconnecting in 5s...");
        this.reconnectTimer = setTimeout(() => {
          this.connect().catch(() => {/* swallow; will retry */});
        }, 5000);
      });
    });
  }

  /** Send a frame. Queues if not yet connected. */
  send(frame: IngestFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    } else {
      this.queue.push(frame);
    }
  }

  /** Gracefully close. */
  close(): void {
    this.closing = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
  }
}
