import { useEffect, useRef, useCallback } from "react";
import type { WsMessage } from "./types";

const BASE_WS =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace("http", "ws");

export function useProjectWebSocket(
  projectId: string | null,
  onMessage: (msg: WsMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (!projectId) return;

    const ws = new WebSocket(`${BASE_WS}/ws/projects/${projectId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Keepalive ping every 25 seconds
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 25_000);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      // Reconnect after 3 seconds
      setTimeout(connect, 3_000);
    };

    ws.onerror = () => ws.close();
  }, [projectId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
