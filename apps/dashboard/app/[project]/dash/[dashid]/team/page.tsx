"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useParams } from "next/navigation";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@repo/ui/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@repo/db";
import { Building2 } from "lucide-react";
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
  name?: string | null;
  image?: string | null;
  avatar?: string | null;
  permission: "editor" | "viewer" | string;
  reservedColumns: string[];
  status: string;
  createdAt: Date | string;
  department?: string | null;
  orgRole?: string | null;
}

interface PendingInvite {
  id: string;
  masterSheet: { id: string; name: string } | null;
  permission: string;
  status: string;
}

interface OrgDeskInfo {
  organizationId: string;
  groupId: string;
  organizationName?: string;
  organizationLogo?: string | null;
  deskName?: string;
  groupName?: string;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const params = useParams();
  const dashid = params?.dashid as string;
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const getMemberAvatar = useCallback(
    (email: string, image?: string | null) => {
      // 1. Direct profile image from Supabase user table (same as projects page)
      if (image) return image;
      // 2. Current user session image
      if (
        userEmail &&
        email &&
        email.toLowerCase() === userEmail.toLowerCase() &&
        session?.user?.image
      ) {
        return session.user.image;
      }
      return undefined;
    },
    [userEmail, session],
  );

  // ─── State ────────────────────────────────────────────────
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [owner, setOwner] = useState<{ id: string; email: string; name: string; image?: string | null; avatar?: string | null } | null>(null);
  const [loadingCollabs, setLoadingCollabs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [orgDeskInfo, setOrgDeskInfo] = useState<OrgDeskInfo | null>(null);

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
      // 1. Check if this is an organization-created desk project
      const { data: wf } = await supabase
        .from("workflow")
        .select("id, name, userId, organizationId, groupId")
        .eq("id", dashid)
        .maybeSingle();

      if (wf?.organizationId && wf?.groupId) {
        // Fetch organization & desk group info
        const [{ data: org }, { data: group }] = await Promise.all([
          supabase.from("organization").select("id, name, logoUrl, ownerEmail").eq("id", wf.organizationId).maybeSingle(),
          supabase.from("organization_group").select("id, name, deskName, leaderId, leaderName, leaderEmail").eq("id", wf.groupId).maybeSingle(),
        ]);

        setOrgDeskInfo({
          organizationId: wf.organizationId,
          groupId: wf.groupId,
          organizationName: org?.name || "Organization",
          organizationLogo: org?.logoUrl,
          deskName: group?.deskName || group?.name || "Team Desk",
          groupName: group?.name || "Departmental Desk",
        });

        // Fetch members of this desk group
        const { data: grpMembers } = await supabase
          .from("organization_group_member")
          .select("memberId, role")
          .eq("groupId", wf.groupId);

        const memberIds = (grpMembers || []).map((gm: any) => gm.memberId);

        let orgMembers: any[] = [];
        if (memberIds.length > 0) {
          const { data: membersData } = await supabase
            .from("organization_member")
            .select("id, name, email, avatar, role, department")
            .in("id", memberIds);
          orgMembers = membersData || [];
        }

        // Set owner as group leader or organization admin
        if (group?.leaderEmail) {
          setOwner({
            id: group.leaderId || "",
            email: group.leaderEmail,
            name: group.leaderName || "Group Leader",
            avatar: null,
          });
        } else if (org?.ownerEmail) {
          setOwner({
            id: org.id,
            email: org.ownerEmail,
            name: `${org.name} Admin`,
            avatar: org.logoUrl,
          });
        }

        // Set collaborators from group members
        const leaderEmail = (group?.leaderEmail || org?.ownerEmail || "").toLowerCase();
        const mappedCollabs: Collaborator[] = orgMembers
          .filter((m: any) => m.email.toLowerCase() !== leaderEmail)
          .map((m: any) => ({
            id: m.id,
            invitedEmail: m.email,
            name: m.name,
            avatar: m.avatar,
            permission: "editor",
            reservedColumns: [],
            status: "accepted",
            createdAt: new Date().toISOString(),
            department: m.department,
            orgRole: m.role,
          }));

        setCollaborators(mappedCollabs);
        setLoadingCollabs(false);
        return;
      }

      // 2. Regular personal project flow
      setOrgDeskInfo(null);
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
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full space-y-6">

        {/* ─── Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl border border-border bg-muted/40 text-foreground shrink-0 shadow-xs">
              <IconUsers className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Team & Common Desk</h1>
                {orgDeskInfo && (
                  <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2 bg-muted/50 border-border text-foreground">
                    {orgDeskInfo.organizationName} • {orgDeskInfo.deskName}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {orgDeskInfo
                  ? "Assigned institutional specialists and desk leaders collaborating on this pipeline."
                  : "Invite collaborators to work together on this desk. Shared members can create blocks and workflows."}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs h-9 shrink-0 border-border hover:bg-muted"
          >
            <IconLink className="size-3.5 text-muted-foreground" />
            <span>Copy Desk Link</span>
          </Button>
        </div>

        {/* ─── Incoming Pending Invitations Banner ──────── */}
        {pendingInvites.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <IconClock className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pending Desk Invitations ({pendingInvites.length})
              </h2>
            </div>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-muted/30 gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-full border border-border bg-muted flex items-center justify-center shrink-0">
                      <IconMail className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        Invitation to join {invite.masterSheet?.name || "Common Desk"}
                      </p>
                      <Badge variant="outline" className="text-[9px] mt-0.5 border-border text-muted-foreground">
                        Role: {invite.permission === "editor" ? "Can edit" : "Can view"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invite.id)}
                      className="gap-1 h-7 text-xs px-3 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <IconCheck className="size-3" />
                      Accept &amp; Join
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(invite.id)}
                      className="gap-1 h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

        {/* ─── Invite Box or Institutional Desk Notice ───────────────────── */}
        {orgDeskInfo ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <IconShieldCheck className="size-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Institutional Desk Group Management
              </h2>
              <Badge variant="outline" className="text-[10px] bg-muted/50 border-border text-foreground">
                {orgDeskInfo.organizationName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This pipeline is owned by <strong className="text-foreground">{orgDeskInfo.organizationName}</strong> under the <strong className="text-foreground">{orgDeskInfo.deskName}</strong> desk. Members are assigned directly through the Organization Portal. Individual email invitations are disabled for enterprise compliance.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <IconUserPlus className="size-4 text-foreground" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Invite People to Common Desk</h2>
            </div>

            {/* Input & Role Selector Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Email Input */}
              <div className="relative flex-1">
                <IconMail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address (e.g. colleague@company.com)..."
                  className="pl-10 h-10 text-xs bg-background border-border focus-visible:ring-1"
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
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
              </div>

              {/* Invite Button */}
              <Button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="h-10 px-5 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs shrink-0"
              >
                {inviting ? (
                  <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconSend className="size-3.5" />
                )}
                {inviting ? "Sending..." : "Send Invite"}
              </Button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>
                Members with <strong>Can edit</strong> role can create blocks, upload CSVs, and execute workflows on the common desk.
              </span>
            </div>
          </div>
        )}

        {/* ─── Middle Section: Pending Invitations (Personal Desks Only) ─────────── */}
        {!orgDeskInfo && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <IconClock className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Pending Invitations {collaborators.filter(c => c.status === 'pending').length > 0 && `(${collaborators.filter(c => c.status === 'pending').length})`}
              </h2>
            </div>

            {loadingCollabs ? (
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 gap-3">
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
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="size-8 rounded-full border border-border shrink-0">
                            <AvatarImage
                              src={getMemberAvatar(collab.invitedEmail)}
                              alt={collab.invitedEmail}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-xs">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
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
                            className="text-[10px] px-2 py-0.5 font-medium border-border text-muted-foreground"
                          >
                            {collab.permission === "editor" ? "Can edit" : "Can view"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            Pending
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
        )}

        {/* ─── Below Section: Current Active Members of Desk ─── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconShieldCheck className="size-4 text-foreground" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
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
                  className="pl-8 h-8 text-xs bg-background border-border"
                />
              </div>
            )}
          </div>

          {loadingCollabs ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 gap-3">
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
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-9 rounded-full border border-border shrink-0 shadow-xs">
                      <AvatarImage
                        src={getMemberAvatar(owner.email)}
                        alt={owner.email}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                        {owner.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold truncate text-foreground">
                          {owner.email}
                        </span>
                        {owner.email.toLowerCase() === userEmail?.toLowerCase() && (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {orgDeskInfo ? "Desk Owner & Group Leader" : "Desk Creator"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                      {orgDeskInfo ? "Leader / Owner" : "Owner"}
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
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 rounded-full border border-border shrink-0 shadow-xs">
                          <AvatarImage
                            src={getMemberAvatar(collab.invitedEmail)}
                            alt={collab.invitedEmail}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-muted text-foreground font-semibold text-xs">
                            {initial}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold truncate text-foreground">
                              {collab.invitedEmail}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">
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
                          className="text-[10px] px-2 py-0.5 font-medium border-border text-muted-foreground"
                        >
                          {collab.permission === "editor" ? "Can edit" : "Can view"}
                        </Badge>

                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 font-medium"
                        >
                          Active
                        </Badge>

                        {!isCurrentUser && !orgDeskInfo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

        {/* ─── Invitation Sent Modal Dialog ─── */}
        <Dialog open={inviteSuccessModalOpen} onOpenChange={setInviteSuccessModalOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border p-6 text-center space-y-4">
            <DialogHeader className="flex flex-col items-center space-y-3">
              <div className="size-12 rounded-full border border-border bg-muted flex items-center justify-center text-foreground mx-auto">
                <IconCheck className="size-6" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">Invitation Sent</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                An email invitation has been sent to the recipient to join your common desk.
              </DialogDescription>
            </DialogHeader>

            {/* Recipient Details Card */}
            <div className="rounded-lg border border-border bg-muted/30 p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Recipient Email:</span>
                <span className="font-semibold text-foreground">{lastInvitedEmail}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Assigned Role:</span>
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  {lastInvitedRole === "editor" ? "Can edit" : "Can view"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-muted-foreground font-medium text-[11px]">Pending Acceptance</span>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setInviteSuccessModalOpen(false)}
                className="w-full text-xs"
              >
                Invite Another
              </Button>

              <Button
                onClick={() => setInviteSuccessModalOpen(false)}
                className="w-full text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
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