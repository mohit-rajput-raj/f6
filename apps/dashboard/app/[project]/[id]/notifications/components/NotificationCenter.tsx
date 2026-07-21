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
  UserX
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
    roleRequested?: string;
    workspaceName?: string;
    ipAddress?: string;
    errorCode?: string;
    rowsCount?: number;
    sheetName?: string;
  };
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Access Request: Admin Permission",
    message: "Elena Rostova requested Admin role access for the project 'Campus Analytics Dashboard'.",
    sender: {
      name: "Elena Rostova",
      email: "elena.rostova@campus.edu",
      avatar: "https://picsum.photos/seed/elena/100/100",
      role: "Lead Researcher"
    },
    category: "request",
    type: "invite",
    priority: "high",
    timestamp: "5 mins ago",
    read: false,
    starred: true,
    project: "Campus Analytics",
    requestStatus: "pending",
    metadata: {
      roleRequested: "Project Administrator",
      workspaceName: "f6-dashboard"
    }
  },
  {
    id: "notif-2",
    title: "Workflow Failure: Attendance Concat",
    message: "Workflow 'Attendance Batch Sync #48' failed on step 'Concat Matrix' due to column dimension mismatch.",
    sender: {
      name: "System Bot",
      email: "system@campus.internal",
      avatar: "https://picsum.photos/seed/sysbot/100/100",
      role: "Automation Service"
    },
    category: "workflow",
    type: "alert",
    priority: "high",
    timestamp: "18 mins ago",
    read: false,
    starred: false,
    project: "Desk Editor",
    metadata: {
      errorCode: "ERR_COL_MISMATCH_32",
      sheetName: "Master Sheet Attendance B.Tech"
    }
  },
  {
    id: "notif-3",
    title: "New Security Login Detected",
    message: "A new session was started from Chrome on Windows 11 (IP: 192.168.1.105, Location: New Delhi).",
    sender: {
      name: "Security Guard",
      email: "security@campus.edu",
      avatar: "https://picsum.photos/seed/security/100/100",
      role: "Security System"
    },
    category: "system",
    type: "security",
    priority: "high",
    timestamp: "42 mins ago",
    read: false,
    starred: true,
    project: "Global Auth",
    metadata: {
      ipAddress: "192.168.1.105"
    }
  },
  {
    id: "notif-4",
    title: "Mentioned in Sheet Comment",
    message: "Dr. Alok Verma tagged you in cell F10: 'Please review the short attendance percentages for MST-1.'",
    sender: {
      name: "Dr. Alok Verma",
      email: "alok.verma@computer.dept",
      avatar: "https://picsum.photos/seed/alok/100/100",
      role: "Department Head"
    },
    category: "inbox",
    type: "mention",
    priority: "medium",
    timestamp: "2 hours ago",
    read: true,
    starred: false,
    project: "Analytics",
    metadata: {
      sheetName: "Attendance Sheet B.Tech II Year"
    }
  },
  {
    id: "notif-5",
    title: "Sheet Sync Succeeded",
    message: "Successfully synchronized 120 rows from Master Sheet to Data Library CSV Storage.",
    sender: {
      name: "Data Sync Service",
      email: "sync@campus.internal",
      avatar: "https://picsum.photos/seed/datasync/100/100",
      role: "Sync Engine"
    },
    category: "workflow",
    type: "success",
    priority: "low",
    timestamp: "3 hours ago",
    read: true,
    starred: false,
    project: "Data Library",
    metadata: {
      rowsCount: 120,
      sheetName: "B.Tech II Year Section B"
    }
  },
  {
    id: "notif-6",
    title: "Workspace Join Request: Neha Koul",
    message: "Neha Koul requested Editor access to team workspace 'Computer Engineering II Year'.",
    sender: {
      name: "Neha Koul",
      email: "neha.koul@student.edu",
      avatar: "https://picsum.photos/seed/neha/100/100",
      role: "Student Representative"
    },
    category: "request",
    type: "invite",
    priority: "medium",
    timestamp: "5 hours ago",
    read: false,
    starred: false,
    project: "Workspace Desk",
    requestStatus: "pending",
    metadata: {
      roleRequested: "Workspace Editor",
      workspaceName: "Computer Engg II Year"
    }
  },
  {
    id: "notif-7",
    title: "OCR Model Training Completed",
    message: "Table OCR Deep Learning model v2.4 finished training with 99.4% precision accuracy.",
    sender: {
      name: "AI Pipeline Engine",
      email: "ai@campus.ai",
      avatar: "https://picsum.photos/seed/aipipe/100/100",
      role: "AI Subsystem"
    },
    category: "system",
    type: "success",
    priority: "low",
    timestamp: "1 day ago",
    read: true,
    starred: true,
    project: "OCR Engine"
  },
  {
    id: "notif-8",
    title: "System Maintenance Notice",
    message: "Scheduled infrastructure maintenance planned for Saturday 02:00 AM UTC. Expect 5m downtime.",
    sender: {
      name: "DevOps Team",
      email: "devops@campus.edu",
      avatar: "https://picsum.photos/seed/devops/100/100",
      role: "DevOps"
    },
    category: "system",
    type: "update",
    priority: "medium",
    timestamp: "2 days ago",
    read: true,
    starred: false,
    project: "Infrastructure"
  }
];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [filterReadStatus, setFilterReadStatus] = useState<"all" | "unread" | "read" | "starred">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority">("newest");
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

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
  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleToggleRead = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
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

  const handleRequestAction = useCallback((id: string, action: "accepted" | "declined", e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              read: true,
              requestStatus: action,
              message: `${n.message} [${action.toUpperCase()}]`
            }
          : n
      )
    );
    if (selectedNotif?.id === id) {
      setSelectedNotif((prev) => (prev ? { ...prev, requestStatus: action } : null));
    }
  }, [selectedNotif]);

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
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Bar & Quick Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
          {/* Real-time Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="notification-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title, sender, message, or project... (Ctrl+K)"
              className="pl-9 pr-10 h-10 bg-muted/40 border-border/60 focus:bg-background transition-colors text-sm"
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
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
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

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
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

            {/* Mark All As Read */}
            <Button
              onClick={handleMarkAllAsRead}
              variant="secondary"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              disabled={stats.unread === 0}
            >
              <CheckCheck className="size-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Mark all as read</span>
            </Button>
          </div>
        </div>

        {/* Stats Summary Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 py-3 flex items-center justify-between border/60">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Notifications</p>
              <p className="text-xl font-bold mt-0.5">{stats.total}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Bell className="size-4" />
            </div>
          </Card>

          <Card className="p-4 py-3 flex items-center justify-between border/60">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Unread Messages</p>
              <p className="text-xl font-bold mt-0.5 text-sky-500">{stats.unread}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Mail className="size-4" />
            </div>
          </Card>

          <Card className="p-4 py-3 flex items-center justify-between border/60">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Requests</p>
              <p className="text-xl font-bold mt-0.5 text-amber-500">{stats.requests}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <UserPlus className="size-4" />
            </div>
          </Card>

          <Card className="p-4 py-3 flex items-center justify-between border/60">
            <div>
              <p className="text-xs text-muted-foreground font-medium">High Priority</p>
              <p className="text-xl font-bold mt-0.5 text-rose-500">{stats.highPriority}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertOctagon className="size-4" />
            </div>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="all" className="gap-1.5 text-xs">
              <Bell className="size-3.5" />
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1.5 text-xs">
              <Inbox className="size-3.5" />
              Inbox ({notifications.filter((n) => n.category === "inbox").length})
            </TabsTrigger>
            <TabsTrigger value="request" className="gap-1.5 text-xs">
              <UserPlus className="size-3.5" />
              Access Requests ({notifications.filter((n) => n.category === "request").length})
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs">
              <Cpu className="size-3.5" />
              System ({notifications.filter((n) => n.category === "system").length})
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-1.5 text-xs">
              <Layers className="size-3.5" />
              Workflows ({notifications.filter((n) => n.category === "workflow").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
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

              {/* Sender Avatar */}
              <Avatar className="size-10 border border-border shrink-0">
                <AvatarImage src={item.sender.avatar} alt={item.sender.name} />
                <AvatarFallback>{item.sender.name.slice(0, 2).toUpperCase()}</AvatarFallback>
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
                      className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <UserCheck className="size-3.5" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleRequestAction(item.id, "declined", e)}
                      className="h-7 px-3 text-xs text-destructive hover:bg-destructive/10 gap-1 border-destructive/30"
                    >
                      <UserX className="size-3.5" /> Decline
                    </Button>
                  </div>
                )}

                {item.requestStatus && item.requestStatus !== "pending" && (
                  <div className="pt-1">
                    <Badge
                      variant={item.requestStatus === "accepted" ? "default" : "destructive"}
                      className="text-[10px] capitalize"
                    >
                      {item.requestStatus}
                    </Badge>
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
