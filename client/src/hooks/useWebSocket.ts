import { useEffect, useState, useRef } from "react";

export interface Opportunity {
  id: number;
  pairId: number;
  strategyId: number;
  rateId: number;
  details: string;
  timestamp: string;
  evaluation?: number;
  evaluationAt?: string;
  entryRate?: number;
  stopLossRate?: number;
  takeProfitRate?: number;
  evaluationPrice?: number;
  pnlAmount?: number;
  signalType: "BUY" | "SELL";
}

export function useWebSocket() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      // Connect to the backend WebSocket (adjust URL for production)
      const wsUrl = import.meta.env.DEV
        ? "ws://localhost:3000"
        : `wss://${window.location.host}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "new_opportunity") {
            const newOpportunity: Opportunity = data.data;
            setOpportunities((prev) => [newOpportunity, ...prev.slice(0, 49)]); // Keep last 50
          } else if (data.type === "connection") {
            console.log("WebSocket connection acknowledged:", data.message);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);

        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { opportunities, isConnected };
}
