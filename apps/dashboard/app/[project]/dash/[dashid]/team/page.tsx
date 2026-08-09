"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams } from "next/navigation";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";
import { toast } from "sonner";
import {
  IconUsers,
  IconMail,
  IconPlus,
  IconTrash,
  IconCheck,
  IconX,
  IconUserPlus,
  IconCopy,
  IconShieldCheck,
  IconClock,
  IconSearch,
  IconSparkles,
  IconLink,
  IconSend,
} from "@tabler/icons-react";
import {
  inviteToDesk,
  getDeskCollaborators,
  removeCollaborator,
  acceptInvite,
  rejectInvite,
  getPendingInvites,
  getWorkflowOwner,
} from "../desk/desk-share-actions";

interface Collaborator {
  id: string;
  invitedEmail: string;
  permission: "editor" | "viewer" | string;
  reservedColumns: string[];
  status: string;
  createdAt: Date | string;
}

interface PendingInvite {
  id: string;
  masterSheet: { id: string; name: string } | null;
  permission: string;
  status: string;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const params = useParams();
  const dashid = params?.dashid as string;
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // ─── State ────────────────────────────────────────────────
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [owner, setOwner] = useState<{ id: string; email: string; name: string } | null>(null);
  const [loadingCollabs, setLoadingCollabs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);

  // Canva-style Invitation Sent Popup Dialog state
  const [inviteSuccessModalOpen, setInviteSuccessModalOpen] = useState(false);
  const [lastInvitedEmail, setLastInvitedEmail] = useState("");
  const [lastInvitedRole, setLastInvitedRole] = useState<"editor" | "viewer">("editor");

  // ─── Load Data ────────────────────────────────────────────
  const loadCollaborators = useCallback(async () => {
    if (!dashid) {
      setLoadingCollabs(false);
      return;
    }
    setLoadingCollabs(true);
    try {
      const [collabs, ownerData] = await Promise.all([
        getDeskCollaborators(undefined, dashid),
        getWorkflowOwner(dashid)
      ]);
      // Filter out the owner's self-share to prevent them appearing as both Owner and collaborator
      const ownerEmail = ownerData?.email?.toLowerCase();
      const filteredCollabs = (collabs as Collaborator[]).filter(
        (c) => c.invitedEmail.toLowerCase() !== ownerEmail
      );
      setCollaborators(filteredCollabs);
      setOwner(ownerData);
    } catch (err) {
      console.error("Failed to load collaborators/owner:", err);
    } finally {
      setLoadingCollabs(false);
    }
  }, [dashid]);

  const loadPendingInvites = useCallback(async () => {
    if (!userEmail) return;
    try {
      const invites = await getPendingInvites(userEmail);
      setPendingInvites(invites as any);
    } catch (err) {
      console.error("Failed to load pending invites:", err);
    }
  }, [userEmail]);

  useEffect(() => {
    loadCollaborators();
    loadPendingInvites();
  }, [loadCollaborators, loadPendingInvites]);

  // ─── Invite Handler ───────────────────────────────────────
  const handleInvite = async () => {
    const emailToInvite = inviteEmail.trim().toLowerCase();
    if (!emailToInvite) {
      toast.error("Please enter an email address.");
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToInvite)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setInviting(true);
    try {
      await inviteToDesk({
        invitedEmail: emailToInvite,
        permission: inviteRole,
        projectWorkflowId: dashid,
      });

      // Save for popup modal display
      setLastInvitedEmail(emailToInvite);
      setLastInvitedRole(inviteRole);
      setInviteSuccessModalOpen(true);

      // Clear input & refresh list
      setInviteEmail("");
      loadCollaborators();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  // ─── Copy Link Handler ────────────────────────────────────
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const inviteUrl = `${window.location.origin}/dash/${dashid}/desk`;
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Desk invite link copied to clipboard!");
    }
  };

  // ─── Action Handlers ──────────────────────────────────────
  const handleAccept = async (shareId: string) => {
    try {
      await acceptInvite(shareId);
      toast.success("Invitation accepted! Welcome to the desk.");
      loadPendingInvites();
      loadCollaborators();
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept invite");
    }
  };

  const handleReject = async (shareId: string) => {
    try {
      await rejectInvite(shareId);
      toast.info("Invitation declined.");
      loadPendingInvites();
    } catch (err: any) {
      toast.error(err?.message || "Failed to decline invite");
    }
  };

  const handleRemove = async (shareId: string, email: string) => {
    if (confirm(`Remove ${email} from this desk?`)) {
      try {
        await removeCollaborator(shareId);
        toast.success(`Removed ${email}`);
        loadCollaborators();
      } catch (err: any) {
        toast.error(err?.message || "Failed to remove member");
      }
    }
  };

  // Filter collaborators by search query
  const filteredCollaborators = collaborators.filter((c) =>
    c.invitedEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="w-full mx-auto space-y-6">

        {/* ─── Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-teal-500 text-white shadow-lg shadow-purple-500/20">
              <IconUsers className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Team & Common Desk</h1>
              <p className="text-xs text-muted-foreground">
                Invite people to collaborate on this common desk. Shared members can work on blocks together.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs h-9 border-dashed hover:bg-accent shrink-0"
          >
            <IconLink className="size-3.5 text-teal-400" />
            Copy Desk Link
          </Button>
        </div>

        {/* ─── Incoming Pending Invitations Banner ──────── */}
        {pendingInvites.length > 0 && (
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IconClock className="size-4 text-amber-500 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-500">
                Pending Desk Invitations ({pendingInvites.length})
              </h2>
            </div>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-card/80 backdrop-blur gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      ✉
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        Invitation to join {invite.masterSheet?.name || "Common Desk"}
                      </p>
                      <Badge variant="outline" className="text-[9px] mt-0.5 border-amber-500/30 text-amber-300">
                        Role: {invite.permission === "editor" ? "Can edit" : "Can view"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invite.id)}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-3 font-medium"
                    >
                      <IconCheck className="size-3" />
                      Accept &amp; Join
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(invite.id)}
                      className="gap-1 h-7 text-xs text-red-400 hover:text-red-600 hover:bg-red-950/20"
                    >
                      <IconX className="size-3" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Canva-Style Invite Box ───────────────────── */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 via-card to-card p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <IconUserPlus className="size-4 text-purple-400" />
            <h2 className="text-sm font-bold tracking-tight">Invite People to Common Desk</h2>
          </div>

          {/* Input & Role Selector Row (Canva style) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Email Input */}
            <div className="relative flex-1">
              <IconMail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address (e.g. colleague@company.com)..."
                className="pl-10 h-10 text-xs bg-background/80 border-purple-500/30 focus-visible:ring-purple-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
              />
            </div>

            {/* Role Select */}
            <div className="sm:w-36">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-purple-500/30 bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="editor">Can edit</option>
                <option value="viewer">Can view</option>
              </select>
            </div>

            {/* Invite Button */}
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="h-10 px-5 gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 text-white font-semibold text-xs shadow-md shadow-purple-500/20 shrink-0"
            >
              {inviting ? (
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconSend className="size-3.5" />
              )}
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>
              🔒 Members with <strong>Can edit</strong> role can create blocks, upload CSVs, and execute workflows on the common desk.
            </span>
          </div>
        </div>

        {/* ─── Middle Section: Pending Invitations ─────────── */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <IconClock className="size-4 text-amber-500 animate-pulse" />
            <h2 className="text-sm font-bold">
              Pending Invitations {collaborators.filter(c => c.status === 'pending').length > 0 && `(${collaborators.filter(c => c.status === 'pending').length})`}
            </h2>
          </div>

          {loadingCollabs ? (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between p-3 rounded-xl border bg-background/50 gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40 rounded" />
                    <Skeleton className="h-2.5 w-24 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-6 w-16 rounded" />
                </div>
              </div>
            </div>
          ) : collaborators.filter(c => c.status === 'pending').length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No pending invitations sent from this desk.
            </p>
          ) : (
            <div className="space-y-2">
              {collaborators
                .filter(c => c.status === 'pending')
                .filter(c => c.invitedEmail.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((collab) => {
                  const initial = collab.invitedEmail.charAt(0).toUpperCase();
                  return (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-background/50 hover:bg-muted/40 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold truncate text-foreground block">
                            {collab.invitedEmail}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            Invited {new Date(collab.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-medium bg-zinc-800 text-zinc-300 border-zinc-700`}
                        >
                          {collab.permission === "editor" ? "Can edit" : "Can view"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-800/50">
                          Pending
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                          title="Cancel invitation"
                          onClick={() => handleRemove(collab.id, collab.invitedEmail)}
                        >
                          <IconTrash className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* ─── Below Section: Current Active Members of Desk ─── */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconShieldCheck className="size-4 text-teal-400" />
              <h2 className="text-sm font-bold">
                Active Members {(!loadingCollabs) && `(${collaborators.filter(c => c.status === 'accepted').length + (owner ? 1 : 0)})`}
              </h2>
            </div>

            {/* Search Box */}
            {collaborators.filter(c => c.status === 'accepted').length > 0 && (
              <div className="relative w-full sm:w-56">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>
            )}
          </div>

          {loadingCollabs ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-background/50 gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-44 rounded" />
                      <Skeleton className="h-2.5 w-28 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16 rounded" />
                    <Skeleton className="h-6 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* 1. Show Owner */}
              {owner && (!searchQuery || owner.email.toLowerCase().includes(searchQuery.toLowerCase())) && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-teal-500/20 bg-teal-950/10 hover:bg-teal-950/20 transition-all gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {owner.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold truncate text-foreground">
                          {owner.email}
                        </span>
                        {owner.email.toLowerCase() === userEmail?.toLowerCase() && (
                          <Badge variant="secondary" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Desk Creator</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-teal-950 text-teal-300 border-teal-700 font-medium">
                      Owner
                    </Badge>
                  </div>
                </div>
              )}

              {/* 2. Show Active Collaborators */}
              {collaborators
                .filter(c => c.status === 'accepted')
                .filter(c => c.invitedEmail.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((collab) => {
                  const isCurrentUser = collab.invitedEmail.toLowerCase() === userEmail?.toLowerCase();
                  const initial = collab.invitedEmail.charAt(0).toUpperCase();

                  return (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-background/50 hover:bg-muted/40 transition-all gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {initial}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold truncate text-foreground">
                              {collab.invitedEmail}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Joined {new Date(collab.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 font-medium ${
                            collab.permission === "editor"
                              ? "bg-indigo-950/50 text-indigo-300 border-indigo-700/50"
                              : "bg-zinc-800 text-zinc-300 border-zinc-700"
                          }`}
                        >
                          {collab.permission === "editor" ? "Can edit" : "Can view"}
                        </Badge>

                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-medium"
                        >
                          Active
                        </Badge>

                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                            title="Remove member"
                            onClick={() => handleRemove(collab.id, collab.invitedEmail)}
                          >
                            <IconTrash className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* ─── Canva-Style Invitation Sent Modal Dialog ─── */}
        <Dialog open={inviteSuccessModalOpen} onOpenChange={setInviteSuccessModalOpen}>
          <DialogContent className="sm:max-w-md bg-card border-purple-500/30 p-6 text-center space-y-4">
            <DialogHeader className="flex flex-col items-center space-y-3">
              {/* Glowing Success Icon */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 mx-auto">
                <IconCheck className="size-7 stroke-[3]" />
              </div>
              <DialogTitle className="text-lg font-bold">Invitation Sent!</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                An email invitation has been sent to recipient to join your common desk.
              </DialogDescription>
            </DialogHeader>

            {/* Recipient Details Card */}
            <div className="rounded-xl border bg-background p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Recipient Email:</span>
                <span className="font-semibold text-foreground">{lastInvitedEmail}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Assigned Role:</span>
                <Badge variant="outline" className="text-[10px] bg-purple-950/50 text-purple-300 border-purple-700/50">
                  {lastInvitedRole === "editor" ? "Can edit" : "Can view"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-amber-400 font-medium text-[11px]">Pending Acceptance</span>
              </div>
            </div>

            <DialogFooter className="flex sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setInviteSuccessModalOpen(false)}
                className="w-full text-xs"
              >
                Invite Another
              </Button>

              <Button
                onClick={() => setInviteSuccessModalOpen(false)}
                className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}