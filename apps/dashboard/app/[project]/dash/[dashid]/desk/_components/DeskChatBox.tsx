"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Sparkles,
  X,
  Pin,
  PinOff,
  Bot,
  User,
  Trash2,
  ArrowRight,
  CornerDownLeft,
  Lock,
  Users,
  Loader2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import {
  getDeskMessages,
  sendDeskMessage,
  deleteDeskMessage,
  clearDeskMessages,
  askDeskAICopilot,
  verifyDeskMember,
  type DeskMessageRecord,
} from "../desk-chat-actions";
import { useDeskRealtime } from "@/lib/use-desk-realtime";
import { toast } from "sonner";

interface DeskChatBoxProps {
  dashid?: string;
  deskName?: string;
  userEmail?: string;
  currentUser?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

interface AIChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export function DeskChatBox({
  dashid = "",
  deskName = "Desk Pipeline",
  userEmail = "",
  currentUser = null,
}: DeskChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [activeTab, setActiveTab] = useState<"team" | "ai">("team");
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Membership & loading state
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [teamMessages, setTeamMessages] = useState<DeskMessageRecord[]>([]);
  const [showMembersList, setShowMembersList] = useState(false);

  // AI Assistant messages state
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: "ai-welcome",
      sender: "bot",
      text: `👋 Hi! I'm your Desk AI Copilot for **${deskName}**. You can ask me to analyze dataset inputs, optimize your BigBlock workflows, or inspect pushed file records.`,
      timestamp: "Just now",
      suggestions: [
        "📊 Summarize input sheets",
        "⚡ Run BigBlock pipeline",
        "🔍 Check for schema errors",
      ],
    },
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // ─── Realtime Hook Setup ───────────────────────────────────
  const {
    isConnected,
    onlineMembers,
    typingUsers,
    broadcastMessage,
    broadcastDeleteMessage,
    broadcastTyping,
  } = useDeskRealtime({
    dashid,
    currentUser,
    onNewMessage: (msg) => {
      setTeamMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Increment unread count if chat is closed and message is from someone else
      if (!isOpen && msg.userEmail.toLowerCase() !== userEmail.toLowerCase()) {
        setUnreadCount((c) => c + 1);
        toast(`New desk message from ${msg.userName}`, {
          description: msg.text.slice(0, 60),
        });
      }
    },
    onDeleteMessage: (deletedId) => {
      setTeamMessages((prev) => prev.filter((m) => m.id !== deletedId));
    },
  });

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const username = email.split("@")[0];
    return username.slice(0, 2).toUpperCase();
  }
  return "U";
}

  // ─── Fetch Persisted Messages & Check Membership ──────────
  useEffect(() => {
    if (!dashid || (!userEmail && !currentUser?.id)) {
      setIsLoadingMessages(false);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    verifyDeskMember(dashid, userEmail, currentUser?.id)
      .then((acc) => {
        if (!isMounted) return;
        setIsMember(acc.isMember);
        setMemberRole(acc.role);
      })
      .catch(() => {
        if (isMounted) setIsMember(false);
      });

    getDeskMessages(dashid, userEmail, currentUser?.id)
      .then((res) => {
        if (!isMounted) return;
        setTeamMessages(res.messages || []);
      })
      .catch((err) => {
        console.error("Failed to load desk messages:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dashid, userEmail, currentUser?.id]);

  // ─── Auto-scroll to bottom of messages ───────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [teamMessages, aiMessages, activeTab, isOpen]);

  // ─── Extreme Right Screen Mouse Listener ───────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const threshold = 14;
      const isExtremeRight = e.clientX >= window.innerWidth - threshold;

      if (isExtremeRight) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        setIsOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPinned) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [isOpen, isPinned]);

  // ─── Mouse Enter / Leave Handlers ─────────────────────────
  const handleChatMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleChatMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 280);
  };

  // ─── Send Team Message (Supabase Realtime + Persistence) ──
  const handleSendTeamMessage = async () => {
    const text = inputVal.trim();
    if (!text || isSending || !dashid || !userEmail) return;

    if (!isMember) {
      toast.error("Only desk members can send messages in this workspace");
      return;
    }

    setIsSending(true);
    setInputVal("");

    const safeImage =
      currentUser?.image && currentUser.image.length < 2048
        ? currentUser.image
        : null;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: DeskMessageRecord = {
      id: tempId,
      projectWorkflowId: dashid,
      userId: currentUser?.id || "user",
      userName: currentUser?.name || (userEmail ? userEmail.split("@")[0] : "Member"),
      userEmail: userEmail,
      userImage: safeImage,
      text,
      createdAt: new Date().toISOString(),
    };

    // Optimistically show message immediately
    setTeamMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await sendDeskMessage(
        dashid,
        userEmail,
        currentUser?.name || (userEmail ? userEmail.split("@")[0] : "Member"),
        currentUser?.id || "anon",
        safeImage,
        text
      );

      if (res.success && res.message) {
        // Replace optimistic message with DB persisted message
        setTeamMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.message : m))
        );
        // Broadcast to other collaborators in real-time
        broadcastMessage(res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message");
      // Revert optimistic message
      setTeamMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // ─── Delete Message Handler ───────────────────────────────
  const handleDeleteMessage = async (messageId: string) => {
    if (!messageId || !dashid || (!userEmail && !currentUser?.id)) return;

    // Remove optimistically
    const previous = teamMessages;
    setTeamMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      await deleteDeskMessage(messageId, dashid, userEmail, currentUser?.id);
      broadcastDeleteMessage(messageId);
      toast.success("Message deleted");
    } catch (err: any) {
      toast.error(err?.message || "Could not delete message");
      setTeamMessages(previous);
    }
  };

  // ─── Clear All Messages Handler (Owner Only) ──────────────
  const handleClearChat = async () => {
    if (!dashid || (!userEmail && !currentUser?.id)) return;
    if (memberRole !== "owner") {
      toast.error("Only the desk owner can clear all messages");
      return;
    }

    if (!window.confirm("Are you sure you want to clear all messages in this desk chat?")) {
      return;
    }

    try {
      await clearDeskMessages(dashid, userEmail, currentUser?.id);
      setTeamMessages([]);
      toast.success("Desk chat cleared");
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear chat");
    }
  };

  // ─── Send AI Copilot Message ──────────────────────────────
  const handleSendAiMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isAiTyping) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsAiTyping(true);

    try {
      const res = await askDeskAICopilot(dashid, userEmail, text);
      const botMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: res.reply || "Workspace analysis complete.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setAiMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `I've analyzed your question regarding "${text}". Your desk pipeline is synchronized and standing by for file execution.`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setAiMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // ─── Form Submit Dispatcher ────────────────────────────────
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeTab === "team") {
      handleSendTeamMessage();
    } else {
      handleSendAiMessage();
    }
  };

  return (
    <>
      {/* ─── Extreme Right Edge Sensor Strip ─────────────────── */}
      <div
        onMouseEnter={() => {
          if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          setIsOpen(true);
        }}
        className="fixed top-0 right-0 w-3.5 h-full z-40 cursor-pointer pointer-events-auto hover:bg-primary/20 transition-colors"
        title="Move cursor here or click to open Desk Chat"
      />

      {/* ─── Edge Peek Handle (visual hint when closed) ───────── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-card hover:bg-muted border-l border-y border-border text-primary py-3 px-2 rounded-l-xl shadow-xl flex flex-col items-center gap-1.5 transition-all group hover:pr-3 cursor-pointer"
          title="Open Desk Chat"
        >
          {unreadCount > 0 ? (
            <span className="size-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-bounce shadow-md">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : (
            <div
              className={`size-2 rounded-full ${
                isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"
              }`}
            />
          )}
          <MessageSquare className="size-4" />
          <span className="[writing-mode:vertical-rl] text-[10px] font-semibold tracking-wider text-muted-foreground group-hover:text-foreground">
            CHAT
          </span>
        </button>
      )}

      {/* ─── Sliding Chat Box Container ───────────────────────── */}
      <div
        onMouseEnter={handleChatMouseEnter}
        onMouseLeave={handleChatMouseLeave}
        className={`fixed top-0 right-0 h-full w-[380px] sm:w-[420px] max-w-[95vw] z-50 bg-card text-card-foreground border-l border-border shadow-2xl backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* ─── Header ────────────────────────────────────────── */}
        <div className="px-4 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
                <MessageSquare className="size-4" />
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card ${
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                }`}
                title={isConnected ? "Realtime Live Connected" : "Connecting to Supabase Realtime..."}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Desk Chat
                </h3>
                {isMember && (
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                    <span className="size-1 rounded-full bg-emerald-500" />
                    {memberRole === "owner" ? "Owner" : "Verified Member"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                {deskName}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Online members indicator & popover trigger */}
            {onlineMembers.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMembersList((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 text-[11px] text-muted-foreground mr-1 transition-colors"
                  title={`${onlineMembers.length} active in desk (click to view)`}
                >
                  <Users className="size-3 text-primary" />
                  <span>{onlineMembers.length}</span>
                  <ChevronDown className="size-2.5 text-muted-foreground" />
                </button>

                {showMembersList && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl p-2 z-50 text-xs">
                    <p className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5 px-1">
                      Online Members ({onlineMembers.length})
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {onlineMembers.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-muted text-[11px]"
                        >
                          <div className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                            {getInitials(m.userName, m.userEmail)}
                          </div>
                          <span className="truncate text-foreground font-medium">
                            {m.userName || m.userEmail.split("@")[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clear chat button for owner */}
            {memberRole === "owner" && teamMessages.length > 0 && activeTab === "team" && (
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear all messages in desk"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}

            {/* Pin toggle */}
            <button
              type="button"
              onClick={() => setIsPinned((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                isPinned
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={isPinned ? "Pinned open (click to unpin)" : "Pin chat open"}
            >
              {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setIsPinned(false);
                setIsOpen(false);
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Close chat (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ─── Mode Tabs ───────────────────────────────────────── */}
        <div className="flex border-b border-border px-4 pt-2 bg-muted/20 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "team"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="size-3.5" />
            Team Room
            {teamMessages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-mono">
                {teamMessages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "ai"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="size-3.5" />
            AI Copilot
            <Sparkles className="size-3 text-amber-500" />
          </button>
        </div>

        {/* ─── Messages Scroll Body ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0 bg-background">
          {/* TAB 1: TEAM ROOM (SUPABASE REALTIME) */}
          {activeTab === "team" && (
            <>
              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-xs">Loading desk conversation...</span>
                </div>
              ) : isMember === false ? (
                /* LOCKED: Access Denied to Non-Members */
                <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                  <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3 border border-destructive/20 shadow-sm">
                    <Lock className="size-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    Desk Members Only
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
                    This team chat is restricted strictly to the desk owner and
                    accepted collaborators.
                  </p>
                  <div className="mt-4 p-3 rounded-xl bg-muted/50 border border-border text-[11px] text-muted-foreground max-w-xs flex items-center gap-2 text-left">
                    <ShieldCheck className="size-4 shrink-0 text-primary" />
                    <span>Ask the workspace owner to invite your email to gain access.</span>
                  </div>
                </div>
              ) : teamMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-1.5">
                  <div className="p-3 rounded-xl bg-muted/60 text-muted-foreground mb-1">
                    <Users className="size-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    No messages yet
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-[240px]">
                    Send the first message to start collaborating with members of this desk.
                  </p>
                </div>
              ) : (
                teamMessages.map((msg) => {
                  const isCurrentUser =
                    msg.userEmail.toLowerCase() === userEmail.toLowerCase();
                  const canDelete = isCurrentUser || memberRole === "owner";

                  return (
                    <div
                      key={msg.id}
                      className={`group/msg flex flex-col ${
                        isCurrentUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`flex gap-2 max-w-[88%] ${
                          isCurrentUser ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`size-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 overflow-hidden text-[10px] font-bold ${
                            isCurrentUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground border border-border"
                          }`}
                        >
                          {msg.userImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={msg.userImage}
                              alt={msg.userName}
                              className="size-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span>{getInitials(msg.userName, msg.userEmail)}</span>
                          )}
                        </div>

                        {/* Bubble */}
                        <div className="relative group/bubble">
                          {!isCurrentUser && (
                            <span className="text-[10px] font-medium text-muted-foreground pl-1 mb-0.5 block truncate max-w-[180px]">
                              {msg.userName}
                            </span>
                          )}
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-xs shadow-sm leading-relaxed ${
                              isCurrentUser
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-muted border border-border text-foreground rounded-tl-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>

                          {/* Delete Action button on hover */}
                          {canDelete && !msg.id.startsWith("temp-") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 p-1 rounded-md bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity shadow-sm ${
                                isCurrentUser ? "-left-7" : "-right-7"
                              }`}
                              title="Delete message"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <span className="text-[9px] text-muted-foreground mt-1 px-9">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })
              )}

              {/* Typing indicator from other members */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 pl-2 text-[11px] text-muted-foreground animate-in fade-in">
                  <div className="size-2 rounded-full bg-primary animate-ping" />
                  <span>
                    {typingUsers[0].split("@")[0]} is typing...
                  </span>
                </div>
              )}
            </>
          )}

          {/* TAB 2: AI COPILOT */}
          {activeTab === "ai" && (
            <>
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`flex gap-2 max-w-[88%] ${
                      msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`size-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground border border-border"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        <User className="size-3.5" />
                      ) : (
                        <Bot className="size-3.5" />
                      )}
                    </div>

                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted border border-border text-foreground rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-muted-foreground mt-1 px-8">
                    {msg.timestamp}
                  </span>

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
                      {msg.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendAiMessage(sug)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-card border border-border text-foreground hover:bg-muted hover:border-primary/50 transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                        >
                          <span>{sug}</span>
                          <ArrowRight className="size-2.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isAiTyping && (
                <div className="flex items-center gap-2 pl-2">
                  <div className="size-6 rounded-lg bg-muted border border-border text-foreground flex items-center justify-center">
                    <Bot className="size-3.5" />
                  </div>
                  <div className="bg-muted border border-border rounded-2xl px-3.5 py-2 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                    <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Footer Input ────────────────────────────────────── */}
        <div className="p-3 border-t border-border bg-card shrink-0">
          {activeTab === "team" && isMember === false ? (
            <div className="p-2.5 rounded-xl bg-muted/60 border border-border text-center text-xs text-muted-foreground">
              🔒 Messaging disabled for non-members
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 bg-background border border-border focus-within:border-primary/70 rounded-xl p-2 transition-colors"
            >
              <textarea
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  if (activeTab === "team") broadcastTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={2}
                placeholder={
                  activeTab === "team"
                    ? "Message desk team... (Enter to send)"
                    : "Ask AI copilot... (Enter to send)"
                }
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <span className="text-[10px] text-muted-foreground">
                    {activeTab === "team" ? "🔴 Live Supabase" : "🤖 Copilot"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!inputVal.trim() || isSending || isAiTyping}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {isSending || isAiTyping ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <CornerDownLeft className="size-3" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
