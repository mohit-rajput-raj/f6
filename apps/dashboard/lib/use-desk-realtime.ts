"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DeskMessageRecord } from "@/app/[project]/dash/[dashid]/desk/desk-chat-actions";

export interface RealtimeUserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  onlineAt: string;
}

export interface UseDeskRealtimeOptions {
  dashid: string;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  onNewMessage?: (msg: DeskMessageRecord) => void;
  onDeleteMessage?: (messageId: string) => void;
  onTypingChange?: (typingUsers: string[]) => void;
  onCustomEvent?: (event: string, payload: any) => void;
}

/**
 * Universal Supabase Realtime Manager for Desk Workspaces
 * 
 * Provides:
 * 1. Live Chat Messaging (Postgres changes + Realtime Broadcast)
 * 2. Instant Message Deletion Broadcast
 * 3. Active Member Presence (who is currently online in this desk)
 * 4. Live Typing Indicators
 * 5. Extensible broadcast API for future realtime features (block updates, notifications, live sync)
 */
export function useDeskRealtime({
  dashid,
  currentUser,
  onNewMessage,
  onDeleteMessage,
  onTypingChange,
  onCustomEvent,
}: UseDeskRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<RealtimeUserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Keep callback refs fresh
  const onNewMessageRef = useRef(onNewMessage);
  const onDeleteMessageRef = useRef(onDeleteMessage);
  const onTypingChangeRef = useRef(onTypingChange);
  const onCustomEventRef = useRef(onCustomEvent);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onDeleteMessageRef.current = onDeleteMessage;
    onTypingChangeRef.current = onTypingChange;
    onCustomEventRef.current = onCustomEvent;
  }, [onNewMessage, onDeleteMessage, onTypingChange, onCustomEvent]);

  useEffect(() => {
    if (!dashid) return;

    const supabase = createClient();
    const channelName = `desk-workspace:${dashid}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: currentUser?.id || currentUser?.email || "anon" },
      },
    });

    // ─── 1. Postgres Changes (Guaranteed delivery on DB insert/delete) ─
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "desk_message",
      },
      (payload) => {
        const row = payload.new;
        if (!row) return;
        // Verify this insert belongs to our current desk workflow
        if (
          row.project_workflow_id &&
          row.project_workflow_id.toLowerCase() !== dashid.toLowerCase()
        ) {
          return;
        }

        const msg: DeskMessageRecord = {
          id: row.id,
          projectWorkflowId: row.project_workflow_id,
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          userImage: row.user_image,
          text: row.text,
          createdAt: row.created_at,
        };
        onNewMessageRef.current?.(msg);
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "desk_message",
      },
      (payload) => {
        const oldRow = payload.old as any;
        if (!oldRow) return;
        // With REPLICA IDENTITY FULL, project_workflow_id is present
        if (
          oldRow.project_workflow_id &&
          oldRow.project_workflow_id.toLowerCase() !== dashid.toLowerCase()
        ) {
          return;
        }

        const deletedId = oldRow.id;
        if (deletedId) {
          onDeleteMessageRef.current?.(deletedId);
        }
      }
    );

    // ─── 2. Instant Realtime Broadcast (sub-15ms message delivery) ───
    channel.on("broadcast", { event: "chat_message" }, ({ payload }) => {
      if (payload && payload.id) {
        onNewMessageRef.current?.(payload as DeskMessageRecord);
      }
    });

    // ─── 3. Instant Realtime Delete Broadcast ─────────────────────
    channel.on("broadcast", { event: "delete_message" }, ({ payload }) => {
      if (payload?.id) {
        onDeleteMessageRef.current?.(payload.id);
      }
    });

    // ─── 4. Typing Indicators ─────────────────────────────────────
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const email = payload?.email;
      if (!email) return;

      setTypingUsers((prev) => {
        if (!prev.includes(email)) return [...prev, email];
        return prev;
      });

      if (typingTimeoutRef.current[email]) {
        clearTimeout(typingTimeoutRef.current[email]);
      }

      typingTimeoutRef.current[email] = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = prev.filter((u) => u !== email);
          onTypingChangeRef.current?.(next);
          return next;
        });
      }, 2500);

      onTypingChangeRef.current?.([email]);
    });

    // ─── 5. Extensible Custom Realtime Events for Future Features ──
    channel.on("broadcast", { event: "desk_event" }, ({ payload }) => {
      if (payload?.type) {
        onCustomEventRef.current?.(payload.type, payload.data);
      }
    });

    // ─── 6. Presence Tracking (Who is currently in this desk) ───────
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const active: RealtimeUserPresence[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            active.push(presences[0]);
          }
        }
        setOnlineMembers(active);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setOnlineMembers((prev) => [...prev, ...(newPresences as any[])]);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const leftIds = (leftPresences as any[]).map((p) => p.userId);
        setOnlineMembers((prev) => prev.filter((p) => !leftIds.includes(p.userId)));
      });

    // ─── Subscribe to Channel ─────────────────────────────────────
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        if (currentUser) {
          channel.track({
            userId: currentUser.id || "anon",
            userName: currentUser.name || "Member",
            userEmail: currentUser.email || "",
            userImage:
              currentUser.image && currentUser.image.length < 2048
                ? currentUser.image
                : null,
            onlineAt: new Date().toISOString(),
          });
        }
      } else {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, [dashid, currentUser?.id, currentUser?.email]);

  // ─── Broadcast new message to channel ───────────────────────────
  const broadcastMessage = useCallback((msg: DeskMessageRecord) => {
    if (!channelRef.current) return;
    // Sanitize userImage so big base64 images do not exceed WebSocket frame limits
    const safeMsg: DeskMessageRecord = {
      ...msg,
      userImage:
        msg.userImage && msg.userImage.length < 2048 ? msg.userImage : null,
    };
    channelRef.current.send({
      type: "broadcast",
      event: "chat_message",
      payload: safeMsg,
    });
  }, []);

  // ─── Broadcast message deletion ─────────────────────────────────
  const broadcastDeleteMessage = useCallback((messageId: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "delete_message",
      payload: { id: messageId },
    });
  }, []);

  // ─── Broadcast typing signal ────────────────────────────────────
  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !currentUser?.email) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { email: currentUser.email, name: currentUser.name },
    });
  }, [currentUser]);

  // ─── Extensible Future Dispatcher ───────────────────────────────
  /**
   * Use this to broadcast any future realtime feature (e.g. "block_run", "cursor_move", "file_pushed")
   */
  const broadcastCustomEvent = useCallback((type: string, data: any) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "desk_event",
      payload: { type, data },
    });
  }, []);

  return {
    isConnected,
    onlineMembers,
    typingUsers,
    broadcastMessage,
    broadcastDeleteMessage,
    broadcastTyping,
    broadcastCustomEvent,
  };
}
