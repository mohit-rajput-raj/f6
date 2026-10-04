"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, Check, X, Loader2, Sparkles, Shield, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/components";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  getPendingInvites,
  acceptInvite,
  rejectInvite,
} from "@/app/[project]/dash/[dashid]/desk/desk-share-actions";

interface Invite {
  id: string;
  invitedEmail: string;
  permission: string;
  projectWorkflowId: string | null;
  masterSheet: {
    id: string;
    name: string;
    user?: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
  };
  createdAt: string;
}

interface ProjectInvitesBannerProps {
  onInviteAccepted?: () => void;
}

export function ProjectInvitesBanner({ onInviteAccepted }: ProjectInvitesBannerProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? "";
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!userEmail && !userId) return;
    try {
      setLoading(true);
      const result = await getPendingInvites(userEmail, userId);
      setInvites((result as any[]) || []);
    } catch (e) {
      console.warn("Failed to load invites for projects page:", e);
    } finally {
      setLoading(false);
    }
  }, [userEmail, userId]);

  useEffect(() => {
    loadInvites();
    const interval = setInterval(loadInvites, 12000);
    return () => clearInterval(interval);
  }, [loadInvites]);

  const handleAccept = async (invite: Invite) => {
    setProcessingId(invite.id);
    try {
      await acceptInvite(invite.id, userId);
      toast.success(`Joined "${invite.masterSheet.name}" successfully!`);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["desk-load"] });
      if (onInviteAccepted) onInviteAccepted();
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept invite");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invite: Invite) => {
    setProcessingId(invite.id);
    try {
      await rejectInvite(invite.id);
      toast.info("Invitation declined");
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline invite");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 px-1">
        <div className="size-2 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 tracking-tight">
          Pending Team &amp; Workspace Requests ({invites.length})
        </span>
      </div>

      <div className="grid gap-3">
        {invites.map((invite) => {
          const sender = invite.masterSheet?.user;
          const senderName = sender?.name || sender?.email?.split("@")[0] || "Team Member";

          return (
            <div
              key={invite.id}
              className="relative overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-zinc-900/80 to-zinc-900/40 p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className="size-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-xs">
                  <UserPlus className="size-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-100">
                      {senderName}
                    </span>
                    <span className="text-xs text-zinc-400">invited you to collaborate on</span>
                    <span className="text-xs font-bold text-indigo-300">
                      "{invite.masterSheet?.name}"
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-mono capitalize"
                    >
                      {invite.permission === "editor" ? "Can Edit" : "Can View"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Accepting gives you access to this workspace's desk blocks, spreadsheet datasets, and automation flows.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invite)}
                  disabled={processingId === invite.id}
                  className="h-8 text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-medium"
                >
                  <X className="size-3.5 mr-1" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAccept(invite)}
                  disabled={processingId === invite.id}
                  className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs"
                >
                  {processingId === invite.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Accept Invitation
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
