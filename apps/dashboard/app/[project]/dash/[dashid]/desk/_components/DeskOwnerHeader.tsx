"use client";

import React, { useState, useEffect } from "react";
import {
  Crown,
  Mail,
  ShieldCheck,
  Clock,
  ArrowLeftRight,
  Pencil,
  Loader2,
  AlertTriangle,
  UserCheck,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@/components/ui/components";
import { toast } from "sonner";
import {
  updateDeskName,
  transferWorkflowOwnership,
  getDeskCollaborators,
} from "../desk-share-actions";

export interface OwnerProfileData {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string;
  emailVerified?: boolean;
  userCreatedAt?: string;
  workflowId: string;
  workflowName: string;
  workflowCreatedAt?: string;
}

interface DeskOwnerHeaderProps {
  dashid: string;
  ownerData: OwnerProfileData | null;
  currentUserId?: string;
  currentUserEmail?: string;
  isOwner?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/** Extracts first characters (initials) of name or email */
function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const username = email.split("@")[0];
    return username.slice(0, 2).toUpperCase();
  }
  return "DO";
}

export function DeskOwnerHeader({
  dashid,
  ownerData,
  currentUserId,
  currentUserEmail,
  isOwner = true,
  isLoading = false,
  onRefresh,
}: DeskOwnerHeaderProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Edit desk name form state
  const [deskName, setDeskName] = useState(ownerData?.workflowName || "Desk");
  const [ownerTitle, setOwnerTitle] = useState(
    ownerData?.role || "Head of Product & Co-Founder"
  );
  const [isSavingName, setIsSavingName] = useState(false);

  // Transfer ownership form state
  const [transferEmail, setTransferEmail] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  // Avatar image load / error state
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgLoading(true);
    setImgError(false);
  }, [ownerData?.image]);

  useEffect(() => {
    if (ownerData?.workflowName) {
      setDeskName(ownerData.workflowName);
    }
    if (ownerData?.role) {
      setOwnerTitle(ownerData.role);
    }
  }, [ownerData]);

  // Load collaborators when transfer modal opens
  useEffect(() => {
    if (isTransferOpen && dashid) {
      getDeskCollaborators(undefined, dashid)
        .then((cols) => setCollaborators(cols || []))
        .catch(() => setCollaborators([]));
    }
  }, [isTransferOpen, dashid]);

  // Format creation date e.g. "Jan 2024"
  const formattedOwnerSince = React.useMemo(() => {
    const rawDate = ownerData?.workflowCreatedAt || ownerData?.userCreatedAt;
    if (!rawDate) return "Jan 2024";
    try {
      const d = new Date(rawDate);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return "Jan 2024";
    }
  }, [ownerData?.workflowCreatedAt, ownerData?.userCreatedAt]);

  // Save updated desk name (project name)
  const handleSaveDeskName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!deskName.trim()) {
      toast.error("Desk name cannot be empty");
      return;
    }
    setIsSavingName(true);
    try {
      await updateDeskName(dashid, deskName.trim());
      toast.success(`Desk name updated to "${deskName.trim()}"`);
      setIsEditOpen(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update desk name");
    } finally {
      setIsSavingName(false);
    }
  };

  // Submit transfer ownership
  const handleTransferOwnership = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = transferEmail.trim();
    if (!cleanEmail) {
      toast.error("Please enter a collaborator's email");
      return;
    }
    if (cleanEmail.toLowerCase() === ownerData?.email?.toLowerCase()) {
      toast.error("This user is already the owner of this desk");
      return;
    }

    setIsTransferring(true);
    try {
      await transferWorkflowOwnership(dashid, cleanEmail, currentUserId);
      toast.success(`Ownership transferred successfully to ${cleanEmail}`);
      setIsTransferOpen(false);
      setTransferEmail("");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer ownership");
    } finally {
      setIsTransferring(false);
    }
  };

  const displayName =
    ownerData?.name ||
    (ownerData?.email ? ownerData.email.split("@")[0] : null) ||
    (currentUserEmail ? currentUserEmail.split("@")[0] : "Desk Owner");

  const displayEmail = ownerData?.email || currentUserEmail || "";
  const avatarUrl = ownerData?.image || null;
  const initials = React.useMemo(
    () => getInitials(displayName, displayEmail),
    [displayName, displayEmail]
  );

  return (
    <>
      {/* ─── Outer Card: Fully responsive to Dark & Light themes ───────── */}
      <div className="w-full bg-card text-card-foreground border border-border rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-2xl transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Avatar + Details */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {/* Avatar with Crown Badge */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted border border-border shadow-inner flex items-center justify-center">
                {isLoading ? (
                  <div className="flex items-center justify-center size-full bg-muted/60">
                    <Loader2 className="size-6 sm:size-7 text-primary animate-spin" />
                  </div>
                ) : avatarUrl && !imgError ? (
                  <div className="relative size-full">
                    {imgLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/60 z-10">
                        <Loader2 className="size-6 text-primary animate-spin" />
                      </div>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className={`w-full h-full object-cover object-center transition-opacity duration-200 ${
                        imgLoading ? "opacity-0" : "opacity-100"
                      }`}
                      onLoad={() => setImgLoading(false)}
                      onError={() => {
                        setImgLoading(false);
                        setImgError(true);
                      }}
                    />
                  </div>
                ) : (
                  <div className="size-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-lg sm:text-2xl tracking-wider select-none shadow-sm">
                    {initials}
                  </div>
                )}
              </div>

              {/* Gold Crown Badge at bottom-right corner */}
              <div
                className="absolute -bottom-1 -right-1 size-6 sm:size-7 rounded-lg bg-amber-500 border-2 border-card flex items-center justify-center shadow-md"
                title="Desk Owner"
              >
                <Crown className="size-3.5 sm:size-4 text-black fill-black" />
              </div>
            </div>

            {/* Profile Info Rows */}
            <div className="flex flex-col min-w-0">
              {/* Row 1: Name + Active Badge */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {isLoading ? (
                  <div className="h-6 w-36 bg-muted animate-pulse rounded-md" />
                ) : (
                  <h2 className="text-foreground font-bold text-lg sm:text-xl tracking-tight truncate">
                    {displayName}
                  </h2>
                )}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                  <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span>Active</span>
                </div>
              </div>

              {/* Row 2: Role / Title */}
              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                {isLoading ? (
                  <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                ) : (
                  <span className="text-muted-foreground text-sm font-normal">
                    {ownerTitle}
                  </span>
                )}
                {ownerData?.workflowName && !isLoading && (
                  <span className="text-[11px] font-medium text-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                    Desk: {ownerData.workflowName}
                  </span>
                )}
              </div>

              {/* Row 3: Meta details (Email, 2FA, Owner Since) */}
              <div className="mt-2 flex items-center gap-4 sm:gap-6 flex-wrap text-xs text-muted-foreground">
                {/* Email */}
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" />
                  {isLoading ? (
                    <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                  ) : (
                    <span className="truncate max-w-[200px] sm:max-w-none text-foreground/85">
                      {displayEmail || "No email"}
                    </span>
                  )}
                </div>

                {/* 2FA Status */}
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                  <span>2FA Enforced</span>
                </div>

                {/* Owner Since */}
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 shrink-0" />
                  <span>Owner since {formattedOwnerSince}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            {/* Transfer Ownership Button */}
            <button
              type="button"
              onClick={() => setIsTransferOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-medium transition-all shadow-sm active:scale-95"
            >
              <ArrowLeftRight className="size-4 text-muted-foreground" />
              <span>Transfer Ownership</span>
            </button>

            {/* Edit Desk Name (Project Name) Button using Primary theme color */}
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <Pencil className="size-4" />
              <span>Edit Desk</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modal 1: Edit Desk / Project Name ───────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-card-foreground p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Pencil className="size-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Edit Desk & Project Name
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Update the name of this desk (project name) and the role title
              displayed in the header.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDeskName} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Desk Name (Project Name)
              </label>
              <Input
                value={deskName}
                onChange={(e) => setDeskName(e.target.value)}
                placeholder="e.g. Finance Hub, Marketing Pipeline..."
                className="bg-background border-input text-foreground focus-visible:ring-primary rounded-xl"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Owner Title / Role
              </label>
              <Input
                value={ownerTitle}
                onChange={(e) => setOwnerTitle(e.target.value)}
                placeholder="e.g. Head of Product & Co-Founder"
                className="bg-background border-input text-foreground focus-visible:ring-primary rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-border text-foreground hover:bg-muted rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingName}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 font-medium"
              >
                {isSavingName ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Modal 2: Transfer Ownership ──────────────────────────── */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md bg-card border border-border text-card-foreground p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <ArrowLeftRight className="size-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Transfer Ownership
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Transfer administrative ownership of this desk and project to
              another verified user.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferOwnership} className="space-y-4 mt-2">
            {/* Warning callout */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
              <p className="leading-relaxed">
                You will surrender owner privileges for this desk. You will
                retain <span className="font-semibold text-foreground">Can edit</span>{" "}
                access as an active collaborator.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Target User Email
              </label>
              <Input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="bg-background border-input text-foreground focus-visible:ring-primary rounded-xl"
              />
            </div>

            {/* Quick collaborator list selector */}
            {collaborators.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  Or select an existing collaborator:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {collaborators.map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTransferEmail(c.invitedEmail)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                        transferEmail.toLowerCase() ===
                        c.invitedEmail?.toLowerCase()
                          ? "bg-primary/15 border-primary text-primary font-medium"
                          : "bg-muted/50 border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <UserCheck className="size-3 text-muted-foreground" />
                      <span>{c.invitedEmail}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTransferOpen(false)}
                className="border-border text-foreground hover:bg-muted rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isTransferring || !transferEmail.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 font-medium"
              >
                {isTransferring ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowLeftRight className="size-4" />
                )}
                Confirm Transfer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
