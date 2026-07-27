"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Mail, Inbox, CheckCircle2, Clock, Trash2, Star, X, RefreshCw } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card } from "@repo/ui/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui/components/ui/avatar";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { fetchNotifications, markNotificationAsRead } from "@/lib/notifications-api";

interface InboxItem {
  id: string;
  title: string;
  message: string;
  sender: { name: string; email: string; avatar: string };
  timestamp: string;
  read: boolean;
  starred: boolean;
  tag: string;
}

export default function NotificationInboxPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadInboxItems = useCallback(async () => {
    const activeUserId = session?.user?.id;
    if (!activeUserId) {
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);
    try {
      const serverNotifications = await fetchNotifications(activeUserId);
      if (serverNotifications) {
        const inboxMapped: InboxItem[] = serverNotifications
          .filter((n) => n.type === "mention" || n.type === "inbox" || n.type === "desk_invite")
          .map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            sender: {
              name: n.data?.sender?.name || (n.type === "desk_invite" ? "Desk Team Invite" : "System User"),
              email: n.data?.sender?.email || "",
              avatar: n.data?.sender?.avatar || n.data?.sender?.image || "",
            },
            timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            read: n.read,
            starred: false,
            tag: n.type === "desk_invite" ? "Invite" : n.type === "mention" ? "Mention" : "Message",
          }));

        setItems(inboxMapped);
      }
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadInboxItems();
    const interval = setInterval(loadInboxItems, 10000);
    return () => clearInterval(interval);
  }, [loadInboxItems]);

  const handleItemClick = useCallback(async (item: InboxItem) => {
    if (!item.read) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      await markNotificationAsRead(item.id);
    }
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread" && item.read) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.sender.name.toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inbox messages..."
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={loadInboxItems}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={isRefreshing}
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </Button>

          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="h-8 text-xs"
          >
            All Messages ({items.length})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="h-8 text-xs"
          >
            Unread ({items.filter((i) => !i.read).length})
          </Button>
        </div>
      </div>

      {/* Inbox Item Cards */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-card/60 flex items-start gap-4">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Inbox className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-medium text-muted-foreground">No inbox messages found</p>
          </Card>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                !item.read ? "bg-card border-primary/30" : "bg-card/40 border-border/40 opacity-90"
              }`}
            >
              <Avatar className="size-10 shrink-0">
                <AvatarImage src={item.sender.avatar} />
                <AvatarFallback>{item.sender.name.slice(0, 2)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm ${!item.read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                      {item.title}
                    </h4>
                    <Badge variant="outline" className="text-[10px]">
                      {item.tag}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, starred: !i.starred } : i)));
                  }}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground"
                >
                  <Star className={`size-4 ${item.starred ? "fill-amber-500 text-amber-500" : ""}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setItems((prev) => prev.filter((i) => i.id !== item.id));
                  }}
                  className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}