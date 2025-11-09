import WebSocket from "ws";
import { createLogger } from "../utils/logger";

const logger = createLogger("websocket");

export class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    // We'll initialize this when the HTTP server is created
    logger.info("WebSocket service initialized");
  }

  public attachToServer(server: any) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on("connection", (ws: WebSocket, req) => {
      logger.info(`New WebSocket connection from ${req.socket.remoteAddress}`);

      // Add client to our set
      this.clients.add(ws);

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connection",
          message: "Connected to Forex Signals WebSocket",
          timestamp: new Date().toISOString(),
        })
      );

      // Handle client messages
      ws.on("message", (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          logger.info("Received message from client:", data);

          // Handle ping/pong for connection health
          if (data.type === "ping") {
            ws.send(
              JSON.stringify({
                type: "pong",
                timestamp: new Date().toISOString(),
              })
            );
          }
        } catch (error) {
          logger.error({ error }, "Error parsing WebSocket message");
        }
      });

      // Handle client disconnection
      ws.on("close", () => {
        logger.info("WebSocket client disconnected");
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on("error", (error) => {
        logger.error({ error }, "WebSocket error");
        this.clients.delete(ws);
      });
    });

    logger.info("WebSocket server attached to HTTP server");
  }

  public broadcastOpportunity(opportunity: any) {
    if (!this.wss) {
      logger.warn("WebSocket server not initialized, cannot broadcast");
      return;
    }

    const message = JSON.stringify({
      type: "new_opportunity",
      data: opportunity,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          logger.error({ error }, "Error sending message to client");
          this.clients.delete(client);
        }
      } else {
        // Remove dead connections
        this.clients.delete(client);
      }
    });

    logger.info(`Broadcasted new opportunity to ${sentCount} clients`);
  }

  public broadcast(message: any) {
    if (!this.wss) {
      logger.warn("WebSocket server not initialized, cannot broadcast");
      return;
    }

    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          sentCount++;
        } catch (error) {
          logger.error({ error }, "Error sending message to client");
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });

    logger.info(`Broadcasted message to ${sentCount} clients`);
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public shutdown() {
    if (this.wss) {
      this.wss.close();
      logger.info("WebSocket server shut down");
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();
