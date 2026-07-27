"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Search, UserPlus, UserCheck, UserX, Shield, CheckCircle2, Clock, X, RefreshCw } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui/components/ui/avatar";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import {
  fetchPendingInvites,
  fetchNotifications,
  acceptDeskInvite,
  rejectDeskInvite,
  type ServerDeskShare,
} from "@/lib/notifications-api";

interface AccessRequest {
  id: string;
  shareId?: string;
  applicant: {
    name: string;
    email: string;
    avatar: string;
    currentRole: string;
  };
  roleRequested: string;
  workspace: string;
  reason: string;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
}

export default function AccessRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const activeEmail = session?.user?.email;
    const activeUserId = session?.user?.id;
    if (!activeEmail && !activeUserId) {
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);
    try {
      // 1. Fetch pending invites from team service
      const pendingShares = await fetchPendingInvites(activeEmail || "", activeUserId || "");

      // 2. Fetch desk_invite notifications from notification service
      const allNotifications = activeUserId ? await fetchNotifications(activeUserId) : [];
      const inviteNotifications = allNotifications.filter((n) => n.type === "desk_invite" || n.type === "invite");

      const mappedFromShares: AccessRequest[] = pendingShares.map((s) => {
        const senderUser = s.masterSheet?.user;
        const senderName = senderUser?.name || senderUser?.email?.split("@")[0] || s.invitedEmail.split("@")[0] || "Collaborator";
        const senderEmail = senderUser?.email || s.invitedEmail;
        const senderAvatar = senderUser?.image || "";

        return {
          id: s.id,
          shareId: s.id,
          applicant: {
            name: senderName,
            email: senderEmail,
            avatar: senderAvatar,
            currentRole: "Collaborator",
          },
          roleRequested: s.permission === "editor" ? "Workspace Editor" : "Workspace Viewer",
          workspace: s.masterSheet?.name || "Shared Desk",
          reason: `Workspace access invite for ${s.permission} permissions.`,
          timestamp: new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: s.status === "accepted" ? "approved" : s.status === "rejected" ? "rejected" : "pending",
        };
      });

      const mappedFromNotifs: AccessRequest[] = inviteNotifications.map((n) => {
        const reqStatus = n.data?.requestStatus || n.data?.status;
        const mappedStatus = reqStatus === "accepted" ? "approved" : reqStatus === "declined" || reqStatus === "rejected" ? "rejected" : "pending";

        return {
          id: n.id,
          shareId: n.data?.shareId || n.id,
          applicant: {
            name: n.data?.sender?.name || n.title || "Collaborator",
            email: n.data?.sender?.email || "colleague@campus.edu",
            avatar: n.data?.sender?.avatar || n.data?.sender?.image || "",
            currentRole: "Collaborator",
          },
          roleRequested: n.data?.roleRequested || "Workspace Editor",
          workspace: n.data?.workspaceName || "Shared Workspace",
          reason: n.message,
          timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: mappedStatus,
        };
      });

      const combined = [...mappedFromShares];
      mappedFromNotifs.forEach((item) => {
        if (
          !combined.some(
            (c) =>
              c.id === item.id ||
              c.shareId === item.shareId ||
              (c.workspace === item.workspace && c.applicant.email.toLowerCase() === item.applicant.email.toLowerCase())
          )
        ) {
          combined.push(item);
        }
      });

      setRequests(combined);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const filtered = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== "all" && req.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        req.applicant.name.toLowerCase().includes(q) ||
        req.applicant.email.toLowerCase().includes(q) ||
        req.roleRequested.toLowerCase().includes(q) ||
        req.workspace.toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  const handleAction = async (item: AccessRequest, action: "approved" | "rejected") => {
    const targetShareId = item.shareId || item.id;
    setRequests((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, status: action } : r))
    );

    const activeUserId = session?.user?.id;
    if (action === "approved") {
      await acceptDeskInvite(targetShareId, activeUserId);
    } else {
      await rejectDeskInvite(targetShareId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests by applicant name, role, workspace..."
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
            onClick={loadRequests}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={isRefreshing}
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </Button>

          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className="h-8 text-xs"
          >
            Pending ({requests.filter((r) => r.status === "pending").length})
          </Button>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-8 text-xs"
          >
            All Requests ({requests.length})
          </Button>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-border/50 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
              </div>
              <Skeleton className="h-14 w-full rounded-lg" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-8 w-32 rounded" />
              </div>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card className="col-span-full p-8 text-center border-dashed">
            <UserPlus className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-medium text-muted-foreground">No access requests match your criteria</p>
          </Card>
        ) : (
          filtered.map((req) => (
            <Card key={req.id} className="border border-border/60 shadow-xs relative overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 border">
                    {req.applicant.avatar ? <AvatarImage src={req.applicant.avatar} alt={req.applicant.name} /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{req.applicant.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-semibold leading-tight">{req.applicant.name}</h4>
                    <p className="text-xs text-muted-foreground">{req.applicant.email}</p>
                    <span className="text-[10px] text-muted-foreground font-mono">Current: {req.applicant.currentRole}</span>
                  </div>
                </div>

                <Badge
                  variant={
                    req.status === "pending"
                      ? "secondary"
                      : req.status === "approved"
                      ? "default"
                      : "destructive"
                  }
                  className="text-[10px] capitalize"
                >
                  {req.status}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested Role:</span>
                    <span className="font-semibold text-primary">{req.roleRequested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workspace:</span>
                    <span className="font-medium text-foreground">{req.workspace}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "{req.reason}"
                </p>

                <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {req.timestamp}
                  </span>

                  {req.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(req, "rejected")}
                        className="h-7 px-3 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <UserX className="size-3.5 mr-1" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(req, "approved")}
                        className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <UserCheck className="size-3.5 mr-1" /> Approve
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium capitalize text-foreground">
                      Status: {req.status}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}