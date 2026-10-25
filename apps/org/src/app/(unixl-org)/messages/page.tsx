"use client";

import React, { useState } from "react";
import { Send, Hash, Bell, Shield, MessageSquare } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import { OrganizationMessage } from "@/lib/organization-data";

export default function MessagesPage() {
  const { activeOrg, currentUser, updateOrg } = useOrg();
  const [activeChannel, setActiveChannel] = useState<"general" | "announcements" | "staff">("general");
  const [chatInput, setChatInput] = useState("");

  if (!activeOrg) return null;

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newMsg: OrganizationMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      content: chatInput.trim(),
      channel: activeChannel,
      timestamp: "Just now",
    };

    updateOrg({
      ...activeOrg,
      messages: [...(activeOrg.messages || []), newMsg],
    });

    setChatInput("");
    toast.success("Message sent to #" + activeChannel);
  };

  const channelMessages = (activeOrg.messages || []).filter(
    (m) => m.channel === activeChannel
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs h-[620px]">
        {/* Channel List */}
        <div className="border-r border-neutral-200 dark:border-neutral-800 p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Channels
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setActiveChannel("general")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                activeChannel === "general"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash className="size-3.5" />
                <span>general</span>
              </div>
              <span className="text-[10px] opacity-70">
                {(activeOrg.messages || []).filter((m) => m.channel === "general").length}
              </span>
            </button>

            <button
              onClick={() => setActiveChannel("announcements")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                activeChannel === "announcements"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="size-3.5" />
                <span>announcements</span>
              </div>
              <span className="text-[10px] opacity-70">
                {(activeOrg.messages || []).filter((m) => m.channel === "announcements").length}
              </span>
            </button>

            <button
              onClick={() => setActiveChannel("staff")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                activeChannel === "staff"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="size-3.5" />
                <span>staff-only</span>
              </div>
              <span className="text-[10px] opacity-70">
                {(activeOrg.messages || []).filter((m) => m.channel === "staff").length}
              </span>
            </button>
          </div>
        </div>

        {/* Messages Feed & Composer */}
        <div className="md:col-span-3 flex flex-col justify-between h-full p-4">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Hash className="size-3.5 text-neutral-400" />
              <span>{activeChannel}</span>
            </h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {activeChannel === "general"
                ? "Workspace-wide communications & active flow updates"
                : activeChannel === "announcements"
                ? "Broadcast alerts and critical notices"
                : "Private administrative staff conversations"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {channelMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                No messages in #{activeChannel} yet. Be the first to start the conversation!
              </div>
            ) : (
              channelMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 text-xs">
                  <img
                    src={msg.senderAvatar || "/pfpImage.png"}
                    alt={msg.senderName}
                    className="size-7 rounded-full object-cover shrink-0 mt-0.5 border border-neutral-200 dark:border-neutral-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/pfpImage.png";
                    }}
                  />
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {msg.senderName}
                      </span>
                      <Badge className="text-[9px] py-0 px-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {msg.senderRole}
                      </Badge>
                      <span className="text-[10px] text-neutral-400">{msg.timestamp}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Message #${activeChannel}... (Press Enter to send)`}
              className="text-xs h-10"
            />
            <Button
              size="sm"
              onClick={handleSendMessage}
              className="h-10 px-4 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
