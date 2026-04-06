import { WebSocketServer, WebSocket } from "ws";

interface WSMessage {
  type: "alarm" | "case_updated" | "device_status" | "heartbeat";
  [key: string]: unknown;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: WebSocketServer) {
    this.wss = server;

    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(
        `[WS] Client connected. Total: ${this.clients.size}`
      );

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log(
          `[WS] Client disconnected. Total: ${this.clients.size}`
        );
      });

      ws.on("error", (err) => {
        console.error("[WS] Client error:", err.message);
        this.clients.delete(ws);
      });

      // Send initial heartbeat
      ws.send(
        JSON.stringify({
          type: "heartbeat",
          online_count: this.clients.size,
          timestamp: new Date().toISOString(),
        })
      );
    });

    // Periodic heartbeat every 30s
    setInterval(() => {
      this.broadcast({
        type: "heartbeat",
        online_count: this.clients.size,
      });
    }, 30_000);
  }

  broadcast(message: WSMessage) {
    const data = JSON.stringify(message);
    for (const client of Array.from(this.clients)) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton
export const wsManager = new WebSocketManager();
