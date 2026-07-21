"use client";

import React, { useState, useMemo } from "react";
import { Search, Mail, Inbox, CheckCircle2, Clock, Trash2, Star, X } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card } from "@repo/ui/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui/components/ui/avatar";

const INBOX_DUMMY_DATA = [
  {
    id: "inbox-1",
    title: "Mentioned in Attendance Sheet",
    message: "Dr. Alok Verma tagged you in cell F10: 'Please review the short attendance percentages for MST-1.'",
    sender: { name: "Dr. Alok Verma", email: "alok.verma@computer.dept", avatar: "https://picsum.photos/seed/alok/100/100" },
    timestamp: "2 hours ago",
    read: false,
    starred: true,
    tag: "Mention"
  },
  {
    id: "inbox-2",
    title: "Project Invitation Accepted",
    message: "Priya Sharma accepted your invitation to collaborate on project 'Trivllo Analytics Dashboard'.",
    sender: { name: "Priya Sharma", email: "priya.sharma@campus.edu", avatar: "https://picsum.photos/seed/priya/100/100" },
    timestamp: "4 hours ago",
    read: false,
    starred: false,
    tag: "Team"
  },
  {
    id: "inbox-3",
    title: "Dataset Export Ready",
    message: "Your requested dataset export 'B.Tech_Attendance_Final_Q3.csv' is ready for download.",
    sender: { name: "Exporter Engine", email: "exporter@campus.internal", avatar: "https://picsum.photos/seed/exporter/100/100" },
    timestamp: "Yesterday",
    read: true,
    starred: false,
    tag: "Data"
  },
  {
    id: "inbox-4",
    title: "Workflow Comment Added",
    message: "Karan Patel commented on 'Concat Matrix Node #2': 'Updated fallback strategy to default zeros.'",
    sender: { name: "Karan Patel", email: "karan.patel@student.edu", avatar: "https://picsum.photos/seed/karan/100/100" },
    timestamp: "2 days ago",
    read: true,
    starred: true,
    tag: "Workflow"
  }
];

export default function NotificationInboxPage() {
  const [items, setItems] = useState(INBOX_DUMMY_DATA);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

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

        <div className="flex items-center gap-2">
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
        {filtered.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Inbox className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-medium text-muted-foreground">No inbox messages found</p>
          </Card>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)))}
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