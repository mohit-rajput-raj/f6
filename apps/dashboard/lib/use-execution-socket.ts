"use client";

// ═══════════════════════════════════════════════════════════
// useExecutionSocket — WebSocket hook for real-time workflow
// execution events from the Express backend.
// Listens for node state changes, progress, errors, pauses.
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from "react";

// ── Event Types ──────────────────────────────────────────────

export type WorkflowEventType =
  | "node_started"
  | "node_completed"
  | "node_error"
  | "node_skipped"
  | "workflow_started"
  | "workflow_completed"
  | "workflow_error"
  | "workflow_paused"
  | "workflow_cancelled";

export interface WorkflowEvent {
  runId: string;
  type: WorkflowEventType;
  nodeId?: string;
  nodeType?: string;
  data?: any;
  error?: string;
  timestamp: string;
}

export type ExecutionSocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface UseExecutionSocketOptions {
  userId?: string;
  serverUrl?: string;
  enabled?: boolean;
  onEvent?: (event: WorkflowEvent) => void;
}

// ── Hook ─────────────────────────────────────────────────────

export function useExecutionSocket({
  userId,
  serverUrl,
  enabled = true,
  onEvent,
}: UseExecutionSocketOptions) {
  const [status, setStatus] = useState<ExecutionSocketStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<WorkflowEvent | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref fresh without re-triggering connect
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (!enabled || !userId) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");

    try {
      const defaultWsUrl =
        typeof window !== "undefined"
          ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:3000/ws`
          : "ws://localhost:3000/ws";
      const finalServerUrl =
        serverUrl || process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;
      const url = `${finalServerUrl}?userId=${encodeURIComponent(userId)}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle workflow execution events
          if (payload.type === "workflow_event" && payload.payload) {
            const wfEvent = { ...payload.payload } as WorkflowEvent;
            const rawType = (wfEvent.type as string) || "";
            if (rawType.includes(":")) {
              wfEvent.type = rawType.replace(":", "_") as any;
            }
            setLastEvent(wfEvent);
            onEventRef.current?.(wfEvent);
          }
        } catch {
          // Ignore invalid JSON
        }
      };

      ws.onerror = () => {
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        socketRef.current = null;

        // Exponential backoff reconnect (max 5 attempts)
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            15000,
          );
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch {
      setStatus("error");
    }
  }, [userId, serverUrl, enabled]);

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

  return {
    status,
    isConnected: status === "connected",
    lastEvent,
    reconnect: connect,
  };
}
