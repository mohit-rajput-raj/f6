import { WebSocketServer, WebSocket } from "ws";
import type { Server as HTTPServer } from "http";
import type { IncomingMessage } from "http";

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public initialize(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const userId = url.searchParams.get("userId");

      ws.isAlive = true;

      if (userId) {
        ws.userId = userId;
        this.registerClient(userId, ws);
      }

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (data: string | Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Handle client authentication message if userId wasn't in URL
          if (message.type === "AUTHENTICATE" && message.userId) {
            ws.userId = message.userId;
            this.registerClient(message.userId, ws);
            ws.send(JSON.stringify({ type: "AUTHENTICATED", userId: message.userId }));
          }

          // Ping mechanism
          if (message.type === "PING") {
            ws.send(JSON.stringify({ type: "PONG" }));
          }
        } catch {
          // Ignore invalid JSON payloads
        }
      });

      ws.on("close", () => {
        if (ws.userId) {
          this.unregisterClient(ws.userId, ws);
        }
      });

      ws.on("error", (err) => {
        console.error(`[ws] Client socket error:`, err);
      });

      // Send initial welcome/connected confirmation
      ws.send(
        JSON.stringify({
          type: "CONNECTED",
          message: "Real-time notifications WebSocket connected",
          userId: ws.userId || null,
        })
      );
    });

    // Heartbeat to clean up dead connections every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((client: WebSocket) => {
        const ws = client as AuthenticatedWebSocket;
        if (ws.isAlive === false) {
          if (ws.userId) this.unregisterClient(ws.userId, ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log("[ws] ✓ Real-time WebSocket server initialized on /ws");
  }

  private registerClient(userId: string, ws: AuthenticatedWebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);
    console.log(`[ws] User connected: ${userId} (${this.clients.get(userId)?.size || 0} active sockets)`);
  }

  private unregisterClient(userId: string, ws: AuthenticatedWebSocket) {
    const userSockets = this.clients.get(userId);
    if (userSockets) {
      userSockets.delete(ws);
      if (userSockets.size === 0) {
        this.clients.delete(userId);
      }
    }
    console.log(`[ws] User disconnected: ${userId}`);
  }

  /**
   * Send a JSON payload to all active WebSocket connections for a given user.
   */
  public sendToUser(userId: string, payload: any) {
    const userSockets = this.clients.get(userId);
    if (!userSockets || userSockets.size === 0) return false;

    const data = JSON.stringify(payload);
    let sentCount = 0;

    userSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        sentCount++;
      }
    });

    return sentCount > 0;
  }

  /**
   * Broadcast a JSON payload to all connected clients.
   */
  public broadcast(payload: any) {
    if (!this.wss) return;
    const data = JSON.stringify(payload);
    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  public close() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.wss) this.wss.close();
  }
}

export const webSocketManager = new WebSocketManager();
