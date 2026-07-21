"use client";

import React, { useState, useMemo } from "react";
import { Search, UserPlus, UserCheck, UserX, Shield, CheckCircle2, Clock, X } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@repo/ui/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui/components/ui/avatar";

interface AccessRequest {
  id: string;
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

const DUMMY_REQUESTS: AccessRequest[] = [
  {
    id: "req-1",
    applicant: {
      name: "Elena Rostova",
      email: "elena.rostova@campus.edu",
      avatar: "https://picsum.photos/seed/elena/100/100",
      currentRole: "Viewer"
    },
    roleRequested: "Project Administrator",
    workspace: "Campus Analytics Dashboard",
    reason: "Need administrator privileges to publish master attendance templates and manage team roles.",
    timestamp: "10 mins ago",
    status: "pending"
  },
  {
    id: "req-2",
    applicant: {
      name: "Neha Koul",
      email: "neha.koul@student.edu",
      avatar: "https://picsum.photos/seed/neha/100/100",
      currentRole: "Contributor"
    },
    roleRequested: "Workspace Editor",
    workspace: "Computer Engg II Year Desk",
    reason: "Require edit permissions to modify block node parameters and update OCR formulas.",
    timestamp: "3 hours ago",
    status: "pending"
  },
  {
    id: "req-3",
    applicant: {
      name: "Rohit Shakya",
      email: "rohit.shakya@campus.edu",
      avatar: "https://picsum.photos/seed/rohit/100/100",
      currentRole: "Guest"
    },
    roleRequested: "Dataset Manager",
    workspace: "Data Library Files",
    reason: "Uploading bulk CSV datasets for attendance audit.",
    timestamp: "1 day ago",
    status: "approved"
  }
];

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>(DUMMY_REQUESTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

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

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r))
    );
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

        <div className="flex items-center gap-2">
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
        {filtered.length === 0 ? (
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
                    <AvatarImage src={req.applicant.avatar} />
                    <AvatarFallback>{req.applicant.name.slice(0, 2)}</AvatarFallback>
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
                        onClick={() => handleAction(req.id, "rejected")}
                        className="h-7 px-3 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <UserX className="size-3.5 mr-1" /> Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.id, "approved")}
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