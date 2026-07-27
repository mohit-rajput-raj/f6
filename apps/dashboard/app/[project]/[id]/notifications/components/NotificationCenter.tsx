"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Bell,
  CheckCheck,
  Filter,
  Star,
  Trash2,
  Mail,
  UserPlus,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  FileSpreadsheet,
  Cpu,
  Layers,
  Inbox,
  UserCheck,
  UserX,
  Radio,
} from "lucide-react";

import { Input } from "@repo/ui/components/ui/input";

import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@repo/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@repo/ui/components/ui/dropdown-menu";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  sender: {
    name: string;
    email: string;
    avatar: string;
    role?: string;
  };
  category: "inbox" | "request" | "system" | "workflow";
  type: "invite" | "alert" | "success" | "mention" | "update" | "security";
  priority: "high" | "medium" | "low";
  timestamp: string;
  read: boolean;
  starred: boolean;
  project: string;
  requestStatus?: "pending" | "accepted" | "declined";
  metadata?: {
    shareId?: string;
    roleRequested?: string;
    workspaceName?: string;
    ipAddress?: string;
    errorCode?: string;
    rowsCount?: number;
    sheetName?: string;
    [key: string]: any;
  };
}

import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  acceptDeskInvite,
  rejectDeskInvite,
  type ServerNotification,
} from "@/lib/notifications-api";

function mapServerToItem(n: ServerNotification): NotificationItem {
  let category: NotificationItem["category"] = "system";
  let type: NotificationItem["type"] = "alert";

  if (n.type === "desk_invite" || n.type === "invite") {
    category = "request";
    type = "invite";
  } else if (n.type === "mention" || n.type === "inbox") {
    category = "inbox";
    type = "mention";
  } else if (n.type === "data_commit" || n.type === "workflow") {
    category = "workflow";
    type = "success";
  }

  const senderName = n.data?.sender?.name || (n.type === "desk_invite" ? "Desk Collaboration Invite" : "System Notification");
  const senderEmail = n.data?.sender?.email || "";
  const senderAvatar = n.data?.sender?.avatar || n.data?.sender?.image || "";

  return {
    id: n.id,
    title: n.title,
    message: n.message,
    sender: {
      name: senderName,
      email: senderEmail,
      avatar: senderAvatar,
      role: n.data?.sender?.role || "Campus System",
    },
    category,
    type,
    priority: n.data?.priority || "medium",
    timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    read: n.read,
    starred: false,
    project: n.data?.workspaceName || n.data?.project || "Shared Desk",
    requestStatus: n.data?.requestStatus || (n.type === "desk_invite" ? "pending" : undefined),
    metadata: n.data,
  };
}

import { useSession } from "@/lib/auth-client";
import { RefreshCw } from "lucide-react";

export function NotificationCenter() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [filterReadStatus, setFilterReadStatus] = useState<"all" | "unread" | "read" | "starred">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority">("newest");
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadServerNotifications = useCallback(async () => {
    const activeUserId = session?.user?.id;
    if (!activeUserId) {
      setIsLoading(false);
      return;
    }
    setIsRefreshing(true);
    try {
      const serverData = await fetchNotifications(activeUserId);
      if (serverData) {
        setNotifications(serverData.map(mapServerToItem));
      }
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [session]);

  // Load real server/database notifications on mount and periodically
  useEffect(() => {
    loadServerNotifications();
    const interval = setInterval(loadServerNotifications, 10000);
    return () => clearInterval(interval);
  }, [loadServerNotifications]);


  // Keyboard shortcut listener (/ or Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("notification-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter & Search Logic
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((item) => {
        // Category filter
        if (activeCategory !== "all" && item.category !== activeCategory) {
          return false;
        }

        // Read status filter
        if (filterReadStatus === "unread" && item.read) return false;
        if (filterReadStatus === "read" && !item.read) return false;
        if (filterReadStatus === "starred" && !item.starred) return false;

        // Priority filter
        if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;

        // Search Query filter
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchMessage = item.message.toLowerCase().includes(q);
          const matchSender = item.sender.name.toLowerCase().includes(q) || item.sender.email.toLowerCase().includes(q);
          const matchProject = item.project.toLowerCase().includes(q);
          return matchTitle || matchMessage || matchSender || matchProject;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const priorityMap = { high: 3, medium: 2, low: 1 };
          return priorityMap[b.priority] - priorityMap[a.priority];
        }
        if (sortBy === "oldest") {
          return a.id.localeCompare(b.id);
        }
        return b.id.localeCompare(a.id);
      });
  }, [notifications, activeCategory, filterReadStatus, priorityFilter, searchQuery, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const requests = notifications.filter((n) => n.category === "request" && n.requestStatus === "pending").length;
    const highPriority = notifications.filter((n) => n.priority === "high" && !n.read).length;
    return { total, unread, requests, highPriority };
  }, [notifications]);

  // Handlers
  const handleMarkAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsAsRead("user-demo-123");
  }, []);

  const handleToggleRead = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
    await markNotificationAsRead(id);
  }, []);

  const handleToggleStar = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n))
    );
  }, []);

  const handleDelete = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (selectedNotif?.id === id) {
      setSelectedNotif(null);
    }
  }, [selectedNotif]);

  const handleRequestAction = useCallback(
    async (id: string, action: "accepted" | "declined", e?: React.MouseEvent) => {
      e?.stopPropagation();
      const target = notifications.find((n) => n.id === id);
      const shareId = target?.metadata?.shareId;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                read: true,
                requestStatus: action,
                metadata: { ...n.metadata, requestStatus: action },
              }
            : n
        )
      );
      if (selectedNotif?.id === id) {
        setSelectedNotif((prev) => (prev ? { ...prev, requestStatus: action } : null));
      }

      if (shareId) {
        if (action === "accepted") {
          await acceptDeskInvite(shareId, session?.user?.id);
        } else {
          await rejectDeskInvite(shareId);
        }
      }
    },
    [notifications, selectedNotif, session]
  );

  // Helper for notification type icons
  const getTypeIcon = (type: NotificationItem["type"], priority: NotificationItem["priority"]) => {
    switch (type) {
      case "invite":
        return <UserPlus className="size-4 text-blue-500" />;
      case "alert":
        return <AlertOctagon className="size-4 text-amber-500" />;
      case "security":
        return <ShieldAlert className="size-4 text-rose-500" />;
      case "success":
        return <CheckCircle2 className="size-4 text-emerald-500" />;
      case "mention":
        return <Mail className="size-4 text-purple-500" />;
      default:
        return <Info className="size-4 text-sky-500" />;
    }
  };

  // Helper for priority badges
  const getPriorityBadge = (priority: NotificationItem["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-medium">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/20 font-medium">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground font-normal">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Bar & Quick Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/50 shadow-xs">
          {/* Real-time Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="notification-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title, sender, message, or project... (Ctrl+K)"
              className="pl-9 pr-10 h-10 bg-muted/30 border-border/60 focus:bg-background transition-colors text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={loadServerNotifications}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
              disabled={isRefreshing}
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                  <SlidersHorizontal className="size-3.5" />
                  <span>Filter: {filterReadStatus}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">Status Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterReadStatus("all")}>All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterReadStatus("unread")}>Unread Only</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterReadStatus("read")}>Read Only</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterReadStatus("starred")}>Starred Only</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Priority Filter</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setPriorityFilter("all")}>All Priorities</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("high")}>High Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("medium")}>Medium Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("low")}>Low Priority</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                  <ArrowUpDown className="size-3.5" />
                  <span>Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("priority")}>By Priority</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleMarkAllAsRead}
              variant="secondary"
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium"
              disabled={stats.unread === 0}
            >
              <CheckCheck className="size-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Mark all as read</span>
            </Button>
          </div>
        </div>

        {/* Stats Summary Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 py-3 flex items-center justify-between border-border/50">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-6 w-12 rounded" />
                </div>
                <Skeleton className="size-9 rounded-lg" />
              </Card>
            ))
          ) : (
            <>
              <Card className="p-4 py-3 flex items-center justify-between border-border/50 shadow-2xs">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Notifications</p>
                  <p className="text-xl font-bold mt-0.5">{stats.total}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Bell className="size-4" />
                </div>
              </Card>

              <Card className="p-4 py-3 flex items-center justify-between border-border/50 shadow-2xs">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Unread Messages</p>
                  <p className="text-xl font-bold mt-0.5 text-sky-500">{stats.unread}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-500">
                  <Mail className="size-4" />
                </div>
              </Card>

              <Card className="p-4 py-3 flex items-center justify-between border-border/50 shadow-2xs">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pending Requests</p>
                  <p className="text-xl font-bold mt-0.5 text-amber-500">{stats.requests}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <UserPlus className="size-4" />
                </div>
              </Card>

              <Card className="p-4 py-3 flex items-center justify-between border-border/50 shadow-2xs">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">High Priority</p>
                  <p className="text-xl font-bold mt-0.5 text-rose-500">{stats.highPriority}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
                  <AlertOctagon className="size-4" />
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 rounded-xl border border-border/40">
            <TabsTrigger value="all" className="gap-1.5 text-xs font-medium">
              <Bell className="size-3.5" />
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1.5 text-xs font-medium">
              <Inbox className="size-3.5" />
              Inbox ({notifications.filter((n) => n.category === "inbox").length})
            </TabsTrigger>
            <TabsTrigger value="request" className="gap-1.5 text-xs font-medium">
              <UserPlus className="size-3.5" />
              Access Requests ({notifications.filter((n) => n.category === "request").length})
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs font-medium">
              <Cpu className="size-3.5" />
              System ({notifications.filter((n) => n.category === "system").length})
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-1.5 text-xs font-medium">
              <Layers className="size-3.5" />
              Workflows ({notifications.filter((n) => n.category === "workflow").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/60">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-3.5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed text-center bg-card/40">
            <div className="p-3 rounded-full bg-muted text-muted-foreground mb-3">
              <Bell className="size-6" />
            </div>
            <h4 className="text-sm font-semibold">No notifications found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? `No notifications matching "${searchQuery}". Try clearing search keywords.`
                : "You're all caught up! No notifications match the active filter criteria."}
            </p>
            {searchQuery && (
              <Button onClick={() => setSearchQuery("")} variant="outline" size="sm" className="mt-4 text-xs">
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedNotif(item);
                if (!item.read) handleToggleRead(item.id);
              }}
              className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/40 hover:shadow-xs ${
                !item.read
                  ? "bg-card border-primary/20 shadow-xs"
                  : "bg-card/40 border-border/40 opacity-90 hover:opacity-100"
              }`}
            >
              {/* Unread Indicator Bar */}
              {!item.read && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
              )}

              <Avatar className="size-10 border border-border shrink-0">
                {item.sender.avatar ? <AvatarImage src={item.sender.avatar} alt={item.sender.name} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{item.sender.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              {/* Content Main Area */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeIcon(item.type, item.priority)}
                    <h4 className={`text-sm font-medium leading-none ${!item.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                      {item.title}
                    </h4>
                    {getPriorityBadge(item.priority)}
                    <Badge variant="outline" className="text-[10px] font-normal px-1.5">
                      {item.project}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="size-3" /> {item.timestamp}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.message}
                </p>

                {/* Sub Metadata / Request Actions */}
                {item.category === "request" && item.requestStatus === "pending" && (
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => handleRequestAction(item.id, "accepted", e)}
                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-2xs"
                    >
                      <UserCheck className="size-3.5" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleRequestAction(item.id, "declined", e)}
                      className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/80 gap-1.5 font-medium"
                    >
                      <UserX className="size-3.5" /> Decline
                    </Button>
                  </div>
                )}

                {item.requestStatus && item.requestStatus !== "pending" && (
                  <div className="pt-1.5">
                    {item.requestStatus === "accepted" ? (
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                        <CheckCircle2 className="size-3.5" /> Accepted &amp; Joined
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted border border-border/60 px-2.5 py-0.5 rounded-md">
                        Declined
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Item Hover Quick Controls */}
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleToggleStar(item.id, e)}
                  title={item.starred ? "Unstar" : "Star"}
                  className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${
                    item.starred ? "text-amber-500" : "text-muted-foreground"
                  }`}
                >
                  <Star className={`size-4 ${item.starred ? "fill-amber-500" : ""}`} />
                </button>

                <button
                  onClick={(e) => handleToggleRead(item.id, e)}
                  title={item.read ? "Mark as unread" : "Mark as read"}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="size-4" />
                </button>

                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  title="Delete notification"
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notification Detailed Dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={(open) => !open && setSelectedNotif(null)}>
        {selectedNotif && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedNotif.type, selectedNotif.priority)}
                {getPriorityBadge(selectedNotif.priority)}
                <Badge variant="outline" className="text-xs">
                  {selectedNotif.category.toUpperCase()}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold">
                {selectedNotif.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Project: {selectedNotif.project}</span> • <span>{selectedNotif.timestamp}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Sender Block */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Avatar className="size-10 border">
                  <AvatarImage src={selectedNotif.sender.avatar} />
                  <AvatarFallback>{selectedNotif.sender.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h5 className="text-xs font-semibold">{selectedNotif.sender.name}</h5>
                  <p className="text-[11px] text-muted-foreground">{selectedNotif.sender.email}</p>
                  {selectedNotif.sender.role && (
                    <span className="text-[10px] text-primary font-medium">{selectedNotif.sender.role}</span>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="p-4 rounded-lg bg-card border text-sm leading-relaxed">
                {selectedNotif.message}
              </div>

              {/* Technical Metadata */}
              {selectedNotif.metadata && (
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5 text-xs font-mono">
                  <p className="font-sans text-[11px] font-semibold text-muted-foreground mb-1">Details & Payload</p>
                  {Object.entries(selectedNotif.metadata).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-semibold text-foreground">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="flex-row items-center justify-between gap-2 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(selectedNotif.id)}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5 mr-1" /> Delete
              </Button>

              <div className="flex gap-2">
                {selectedNotif.category === "request" && selectedNotif.requestStatus === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(selectedNotif.id, "declined")}
                      variant="outline"
                      className="text-xs text-destructive border-destructive/30"
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRequestAction(selectedNotif.id, "accepted")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Accept Request
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="sm" onClick={() => setSelectedNotif(null)} className="text-xs">
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
