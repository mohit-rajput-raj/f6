"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface WebSocketNotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseNotificationSocketOptions {
  userId?: string;
  serverUrl?: string;
  onNotification?: (notification: WebSocketNotificationPayload) => void;
  enabled?: boolean;
}

export function useNotificationSocket({
  userId,
  serverUrl = "ws://localhost:3000/ws",
  onNotification,
  enabled = true,
}: UseNotificationSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastNotification, setLastNotification] = useState<WebSocketNotificationPayload | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || !userId) return;

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus("connecting");

    try {
      const url = `${serverUrl}?userId=${encodeURIComponent(userId)}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "NOTIFICATION_RECEIVED" && payload.notification) {
            setLastNotification(payload.notification);
            onNotification?.(payload.notification);
          }
        } catch {
          // Quietly handle JSON parse error
        }
      };

      ws.onerror = () => {
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        socketRef.current = null;

        // Max 2 reconnect attempts if external server is offline
        if (reconnectAttemptsRef.current < 2) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 5000);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch {
      setStatus("error");
    }
  }, [userId, serverUrl, enabled, onNotification]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendTestEvent = useCallback((testNotification: Partial<WebSocketNotificationPayload>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "TEST_NOTIFICATION",
          notification: testNotification,
        })
      );
    }
  }, []);

  return {
    status,
    isConnected: status === "connected",
    lastNotification,
    reconnect: connect,
    sendTestEvent,
  };
}
