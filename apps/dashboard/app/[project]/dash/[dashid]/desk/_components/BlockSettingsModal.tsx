"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@/components/ui/components";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Settings,
  Shield,
  UserCheck,
  Lock,
  Unlock,
  KeyRound,
  Sliders,
  Webhook,
  Activity,
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Cpu,
  RefreshCw,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  setBlockSecurity,
  updateBlockSettings,
} from "../desk-block-actions";
import { getDeskCollaborators } from "../desk-share-actions";
import { useDeskStore, type DeskBlockState } from "@/stores/desk-store";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@repo/ui/components/ui/avatar";
import { useSession } from "@/lib/auth-client";

interface BlockSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: DeskBlockState;
  dashid: string;
  currentUserEmail?: string;
  isOwner?: boolean;
  onDeleteTab?: (childId: string) => Promise<void>;
  onRenameTab?: (childId: string, name: string) => Promise<void>;
}

type TabKey = "general" | "coowner" | "security" | "webhooks" | "compute" | "audit" | "danger";

export function BlockSettingsModal({
  isOpen,
  onClose,
  block,
  dashid,
  currentUserEmail,
  isOwner,
  onDeleteTab,
  onRenameTab,
}: BlockSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [tabName, setTabName] = useState(block.name || "");
  const [coOwnerEmail, setCoOwnerEmail] = useState(block.coOwnerEmail || "");
  const [isPasswordProtected, setIsPasswordProtected] = useState(
    Boolean(block.isPasswordProtected)
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [collaborators, setCollaborators] = useState<Array<{ invitedEmail: string; permission: string }>>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password removal confirmation dialog state
  const [isRemovePasswordOpen, setIsRemovePasswordOpen] = useState(false);
  const [removeConfirmationPassword, setRemoveConfirmationPassword] = useState("");
  const [isRemovingPassword, setIsRemovingPassword] = useState(false);

  // Store actions
  const setBlockSecurityStore = useDeskStore((s) => s.setBlockSecurity);
  const setBlockSettingsStore = useDeskStore((s) => s.setBlockSettings);

  // Permissions calculation
  const isCoOwner = Boolean(
    currentUserEmail &&
    block.coOwnerEmail &&
    block.coOwnerEmail.toLowerCase() === currentUserEmail.toLowerCase()
  );
  const canAssignCoOwner = Boolean(isOwner || isCoOwner);
  // Rule: if co-owner exists, ONLY co-owner can delete. If no co-owner, owner can delete.
  const canDeleteTab = Boolean(
    block.coOwnerEmail ? isCoOwner : isOwner
  );

  // Dummy settings state
  const [webhookUrl, setWebhookUrl] = useState("https://api.internal-mesh.io/v1/blocks/webhook");
  const [timeoutSeconds, setTimeoutSeconds] = useState("120");
  const [memoryLimit, setMemoryLimit] = useState("512MB");
  const [concurrency, setConcurrency] = useState("2");
  const [autoRetry, setAutoRetry] = useState(true);

  const { data: session } = useSession();
  const getEmailAvatar = (email: string) => {
    if (
      session?.user?.email &&
      email &&
      session.user.email.toLowerCase() === email.toLowerCase() &&
      session.user.image
    ) {
      return session.user.image;
    }
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}&backgroundColor=27272a,3f3f46&textColor=ffffff`;
  };

  useEffect(() => {
    if (isOpen) {
      setTabName(block.name || "");
      setCoOwnerEmail(block.coOwnerEmail || "");
      setIsPasswordProtected(Boolean(block.isPasswordProtected));
      setPassword("");
      setConfirmPassword("");
      setRemoveConfirmationPassword("");
      setIsRemovePasswordOpen(false);

      // Fetch team collaborators to suggest for co-ownership
      if (dashid) {
        getDeskCollaborators(undefined, dashid)
          .then((res: any[]) => {
            setCollaborators(res || []);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, block, dashid]);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      if (tabName.trim() && tabName !== block.name && onRenameTab) {
        await onRenameTab(block.id, tabName.trim());
      }
      await updateBlockSettings(block.id, {
        updatedAt: new Date().toISOString(),
      }, { name: tabName.trim() });
      toast.success("General block settings updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCoOwner = async () => {
    if (!canAssignCoOwner) {
      toast.error("Only the workspace owner or current tab co-owner have rights to assign a co-owner.");
      return;
    }
    setIsSaving(true);
    try {
      const emailToSet = coOwnerEmail.trim() || null;
      await setBlockSecurity(block.id, {
        coOwnerEmail: emailToSet,
        userEmail: currentUserEmail,
        isOwnerUser: isOwner,
      });
      setBlockSecurityStore(block.id, { coOwnerEmail: emailToSet });
      toast.success(
        emailToSet
          ? `Assigned ${emailToSet} as Co-Owner of this block`
          : "Removed Co-Owner from this block"
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update co-owner");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (isPasswordProtected && password) {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (password.length < 4) {
        toast.error("Password must be at least 4 characters");
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await setBlockSecurity(block.id, {
        isPasswordProtected,
        password: isPasswordProtected && password ? password : isPasswordProtected ? undefined : "",
        userEmail: currentUserEmail,
        isOwnerUser: isOwner,
      });

      setBlockSecurityStore(block.id, {
        isPasswordProtected: res.isPasswordProtected,
      });

      setPassword("");
      setConfirmPassword("");
      toast.success(
        res.isPasswordProtected
          ? "Password protection enabled for this block editor"
          : "Password protection disabled"
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update security settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRemovePassword = async () => {
    if (!removeConfirmationPassword.trim()) {
      toast.error("Please enter the current password to confirm removal");
      return;
    }

    setIsRemovingPassword(true);
    try {
      await setBlockSecurity(block.id, {
        isPasswordProtected: false,
        password: "",
        currentPasswordConfirmation: removeConfirmationPassword.trim(),
        userEmail: currentUserEmail,
        isOwnerUser: isOwner,
      });
      setIsPasswordProtected(false);
      setBlockSecurityStore(block.id, { isPasswordProtected: false });
      setPassword("");
      setConfirmPassword("");
      setRemoveConfirmationPassword("");
      setIsRemovePasswordOpen(false);
      toast.success("Password removed successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove password. Please check your password.");
    } finally {
      setIsRemovingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteTab) return;
    if (!canDeleteTab) {
      if (block.coOwnerEmail) {
        toast.error(`Only the assigned co-owner (${block.coOwnerEmail}) can delete this tab.`);
      } else {
        toast.error("Only the workspace owner can delete this tab.");
      }
      return;
    }

    if (confirm(`Are you sure you want to delete tab "${block.name}"? This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await onDeleteTab(block.id);
        toast.success("Tab deleted successfully");
        onClose();
      } catch (e: any) {
        toast.error(e?.message || "Failed to delete tab");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] p-0 border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Settings className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
                Block Settings
                <Badge variant="outline" className="text-[10px] bg-zinc-900 text-zinc-300 border-zinc-700 font-mono">
                  {block.name}
                </Badge>
                {block.isPasswordProtected && (
                  <Badge variant="outline" className="text-[10px] bg-zinc-900 text-zinc-300 border-zinc-700 font-mono flex items-center gap-1">
                    <Lock className="size-2.5 text-zinc-400" /> Protected
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Configure tab responsibilities, editor security password, and pipeline settings.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body (Sidebar + Tab Content) */}
        <div className="flex flex-1 overflow-hidden min-h-[420px]">
          {/* Sidebar Navigation */}
          <div className="w-48 border-r border-zinc-800/80 bg-zinc-950/60 p-3 space-y-1 shrink-0 overflow-y-auto">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                activeTab === "general"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Sliders className="size-3.5 text-zinc-400" />
              General
            </button>

            <button
              onClick={() => setActiveTab("coowner")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                activeTab === "coowner"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <UserCheck className="size-3.5 text-zinc-400" />
              Co-Owner & Roles
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                activeTab === "security"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Shield className="size-3.5 text-zinc-400" />
              Security & Password
            </button>

            <div className="pt-2 pb-1 px-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-600">Advanced (Mock)</span>
            </div>

            <button
              onClick={() => setActiveTab("webhooks")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                activeTab === "webhooks"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Webhook className="size-3.5 text-zinc-400" />
              Webhooks
            </button>

            <button
              onClick={() => setActiveTab("compute")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                activeTab === "compute"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Cpu className="size-3.5 text-zinc-400" />
              Compute & Limits
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                activeTab === "audit"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Activity className="size-3.5 text-zinc-400" />
              Audit Log
            </button>

            <div className="pt-3">
              <button
                onClick={() => setActiveTab("danger")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                  activeTab === "danger"
                    ? "bg-zinc-800 text-red-400 font-semibold"
                    : "text-zinc-400 hover:text-red-400 hover:bg-zinc-900"
                }`}
              >
                <AlertTriangle className="size-3.5 text-zinc-400" />
                Danger Zone
              </button>
            </div>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-zinc-900/30">
            {/* ─── 1. General Tab ─── */}
            {activeTab === "general" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">General Block Configuration</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Customize tab title, identifiers, and write back permissions.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Tab / Block Display Name</label>
                    <Input
                      value={tabName}
                      onChange={(e) => setTabName(e.target.value)}
                      placeholder="e.g. Attendance Processor"
                      className="bg-zinc-900 border-zinc-700 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">Block Identifier</span>
                      <p className="text-xs text-zinc-300 font-mono truncate">{block.id}</p>
                    </div>
                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">Editor Workflow ID</span>
                      <p className="text-xs text-zinc-300 font-mono truncate">{block.editorWorkflowId}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-300">Reserved MasterSheet Columns</span>
                      <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700 font-mono">
                        {block.reservedColumns?.length || 0} columns
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      {block.reservedColumns && block.reservedColumns.length > 0
                        ? block.reservedColumns.join(", ")
                        : "No specific column lock — output columns will dynamically map during commit."}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveGeneral}
                    disabled={isSaving}
                    className="h-8 text-xs bg-zinc-100 hover:bg-white text-zinc-950 font-medium"
                  >
                    {isSaving ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Check className="size-3 mr-1.5" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}

            {/* ─── 2. Co-Owner & Roles Tab ─── */}
            {activeTab === "coowner" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <UserCheck className="size-4 text-zinc-300" />
                    Block Co-Owner & Responsibilities
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Appoint any team member to be in charge of this tab. Co-owners have exclusive privileges to set passwords and configure the editor.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Current Co-owner Profile Card */}
                  {coOwnerEmail && (
                    <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/70 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 rounded-full ring-1 ring-zinc-700/80 shrink-0">
                          <AvatarImage
                            src={getEmailAvatar(coOwnerEmail)}
                            alt={coOwnerEmail}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xs bg-zinc-800 text-zinc-200 font-semibold">
                            {coOwnerEmail.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-zinc-100 truncate">
                              {coOwnerEmail}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-zinc-800 text-zinc-300 border-zinc-700">
                              Assigned Co-Owner
                            </Badge>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Full management access to this block tab
                          </p>
                        </div>
                      </div>
                      {canAssignCoOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCoOwnerEmail("")}
                          className="h-7 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-200 text-xs font-medium">
                      <Sparkles className="size-3.5 text-zinc-400" />
                      <span>Co-Owner Permissions</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      The assigned member can set and manage editor passwords, adjust workflow node limits, and open the editor directly without password barriers.
                    </p>
                  </div>

                  {!canAssignCoOwner && (
                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="size-4 shrink-0 text-zinc-400" />
                      <span>Only the workspace owner or current tab co-owner have rights to assign or change the co-owner.</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      {coOwnerEmail ? "Change Co-Owner Email" : "Assign Co-Owner Email Address"}
                    </label>
                    <Input
                      value={coOwnerEmail}
                      onChange={(e) => setCoOwnerEmail(e.target.value)}
                      placeholder="collaborator@company.com"
                      disabled={!canAssignCoOwner}
                      className="bg-zinc-900 border-zinc-700 text-sm disabled:opacity-50"
                    />
                  </div>

                  {collaborators.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-medium text-zinc-400">Select from Team Members:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {collaborators.map((c) => {
                          const isSelected = coOwnerEmail.toLowerCase() === c.invitedEmail.toLowerCase();
                          return (
                            <button
                              key={c.invitedEmail}
                              type="button"
                              disabled={!canAssignCoOwner}
                              onClick={() => setCoOwnerEmail(c.invitedEmail)}
                              className={`text-xs pl-1.5 pr-2.5 py-1 rounded-full border transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isSelected
                                  ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-medium shadow-2xs"
                                  : "bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100"
                              }`}
                            >
                              <Avatar className="size-4 rounded-full ring-1 ring-zinc-700 shrink-0">
                                <AvatarImage src={getEmailAvatar(c.invitedEmail)} alt={c.invitedEmail} />
                                <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-300">
                                  {c.invitedEmail.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="max-w-[130px] truncate">{c.invitedEmail}</span>
                              <span className="text-[10px] text-zinc-500">({c.permission})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveCoOwner}
                      disabled={isSaving || !canAssignCoOwner}
                      className="h-8 text-xs bg-zinc-100 hover:bg-white text-zinc-950 font-medium disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Check className="size-3 mr-1.5" />}
                      Update Co-Owner
                    </Button>
                    {coOwnerEmail && canAssignCoOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCoOwnerEmail("");
                        }}
                        className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
                      >
                        Clear Co-Owner
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── 3. Security & Password Tab ─── */}
            {activeTab === "security" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Shield className="size-4 text-zinc-300" />
                    Editor Password Protection
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Protect the block workflow editor with a server-verified password.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Protection Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
                        {isPasswordProtected ? (
                          <Lock className="size-3.5 text-zinc-300" />
                        ) : (
                          <Unlock className="size-3.5 text-zinc-500" />
                        )}
                        <span>Require Password to Access Editor</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        When enabled, team members must enter the security key every time they open the editor.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isPasswordProtected && block.isPasswordProtected) {
                          setIsRemovePasswordOpen(true);
                        } else {
                          setIsPasswordProtected(!isPasswordProtected);
                        }
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isPasswordProtected ? "bg-zinc-100" : "bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${
                          isPasswordProtected ? "translate-x-4 bg-zinc-950" : "translate-x-0 bg-zinc-400"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Password fields if enabled */}
                  {isPasswordProtected && (
                    <div className="space-y-3 p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300">
                          {block.isPasswordProtected ? "Update Password" : "Set Block Password"}
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={block.isPasswordProtected ? "Leave blank to keep existing" : "Enter new password"}
                            className="bg-zinc-900 border-zinc-700 pr-10 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                        </div>
                      </div>

                      {password && (
                        <div className="space-y-1.5 animate-in fade-in">
                          <label className="text-xs font-medium text-zinc-300">Confirm Password</label>
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="bg-zinc-900 border-zinc-700 text-sm"
                          />
                        </div>
                      )}

                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <KeyRound className="size-3 text-zinc-400" />
                        <span>Password is encrypted with salted PBKDF2 and verified strictly on the backend API.</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveSecurity}
                      disabled={isSaving}
                      className="h-8 text-xs bg-zinc-100 hover:bg-white text-zinc-950 font-medium"
                    >
                      {isSaving ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Check className="size-3 mr-1.5" />}
                      Save Security Settings
                    </Button>

                    {block.isPasswordProtected && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsRemovePasswordOpen(true)}
                        disabled={isSaving}
                        className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      >
                        Remove Password
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── 4. Webhooks (Dummy UI) ─── */}
            {activeTab === "webhooks" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Webhook className="size-4 text-zinc-300" />
                    Block Event Webhooks (Mock API)
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Send real-time HTTP POST notifications when this tab processes data or commits output.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Payload Delivery URL</label>
                    <Input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="bg-zinc-900 border-zinc-700 text-sm font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-zinc-300">Trigger Events</span>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-zinc-300">
                        <input type="checkbox" defaultChecked className="rounded border-zinc-700 text-zinc-200" />
                        <span>Execution Succeeded (output dataset ready)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-zinc-300">
                        <input type="checkbox" defaultChecked className="rounded border-zinc-700 text-zinc-200" />
                        <span>MasterSheet Merge Committed</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-zinc-300">
                        <input type="checkbox" defaultChecked className="rounded border-zinc-700 text-zinc-200" />
                        <span>Execution Failed / Syntax Error</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={() => toast.success("Test webhook ping dispatched! [Status: 200 OK]")}
                      className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    >
                      <RefreshCw className="size-3 mr-1.5" />
                      Send Test Ping
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 5. Compute & Limits (Dummy UI) ─── */}
            {activeTab === "compute" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Cpu className="size-4 text-zinc-300" />
                    Compute Resource Allocation (Mock)
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Fine-tune node worker memory limits and concurrency thresholds.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Memory Allocation</label>
                      <select
                        value={memoryLimit}
                        onChange={(e) => setMemoryLimit(e.target.value)}
                        className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-700 px-3 text-xs text-zinc-200"
                      >
                        <option value="256MB">256 MB (Standard)</option>
                        <option value="512MB">512 MB (Optimal)</option>
                        <option value="1GB">1024 MB (Heavy Excel)</option>
                        <option value="2GB">2048 MB (Massive CSV)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Max Worker Concurrency</label>
                      <select
                        value={concurrency}
                        onChange={(e) => setConcurrency(e.target.value)}
                        className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-700 px-3 text-xs text-zinc-200"
                      >
                        <option value="1">1 Thread (Sequential)</option>
                        <option value="2">2 Threads (Parallel)</option>
                        <option value="4">4 Threads (High Performance)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Timeout Threshold (seconds)</label>
                    <Input
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(e.target.value)}
                      type="number"
                      className="bg-zinc-900 border-zinc-700 text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={autoRetry}
                      onChange={(e) => setAutoRetry(e.target.checked)}
                      className="rounded border-zinc-700 text-zinc-200"
                    />
                    <span>Auto-retry failed transformations up to 3 times</span>
                  </label>

                  <Button
                    size="sm"
                    onClick={() => toast.success("Compute preferences saved")}
                    className="h-8 text-xs bg-zinc-100 hover:bg-white text-zinc-950 font-medium"
                  >
                    Save Compute Config
                  </Button>
                </div>
              </div>
            )}

            {/* ─── 6. Audit Log (Dummy UI) ─── */}
            {activeTab === "audit" && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <Activity className="size-4 text-zinc-300" />
                    Security & Activity Audit Trail
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Immutable history of security adjustments and workflow events.
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/80 overflow-hidden text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-zinc-200">Security Check Passed</span>
                      <p className="text-[11px] text-zinc-500 font-mono">Editor password verified via backend API</p>
                    </div>
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                      Just now
                    </Badge>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-zinc-200">Co-Owner Assignment</span>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        {block.coOwnerEmail ? `Assigned to ${block.coOwnerEmail}` : "Standard project role"}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                      Recent
                    </Badge>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-zinc-200">Workflow Execution</span>
                      <p className="text-[11px] text-zinc-500 font-mono">Completed transformation in 340ms</p>
                    </div>
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                      1 hour ago
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 7. Danger Zone ─── */}
            {activeTab === "danger" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="size-4" />
                    Danger Zone
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Irreversible actions for this block tab.</p>
                </div>

                <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 space-y-3">
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-200">Delete This Tab</h5>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Permanently remove this tab, its node editor workflow, and saved sheet inputs.
                    </p>
                    {block.coOwnerEmail && (
                      <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-mono">
                        <Shield className="size-3" />
                        Tab has co-owner: {block.coOwnerEmail}. Only this co-owner can delete it.
                      </p>
                    )}
                    {!block.coOwnerEmail && (
                      <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-mono">
                        <Shield className="size-3" />
                        Tab has no co-owner. Only workspace owner can delete it.
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting || !canDeleteTab}
                    className="h-8 text-xs bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Trash2 className="size-3 mr-1.5" />}
                    Delete Tab
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* ─── Remove Password Confirmation Dialog ─── */}
      <Dialog open={isRemovePasswordOpen} onOpenChange={(open) => !open && setIsRemovePasswordOpen(false)}>
        <DialogContent className="sm:max-w-[420px] p-6 border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-zinc-100">
                  Confirm Password Removal
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  Enter the current tab password to verify your authorization before removing protection.
                </DialogDescription>
              </div>
            </div>

            <div className="space-y-2 py-2">
              <label className="text-xs font-medium text-zinc-300">Current Password</label>
              <Input
                type="password"
                value={removeConfirmationPassword}
                onChange={(e) => setRemoveConfirmationPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-zinc-900 border-zinc-700 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmRemovePassword();
                }}
              />
              <p className="text-[11px] text-zinc-500">
                Only the workspace owner or assigned tab co-owner can remove protection using the current password.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsRemovePasswordOpen(false);
                  setRemoveConfirmationPassword("");
                }}
                disabled={isRemovingPassword}
                className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmRemovePassword}
                disabled={isRemovingPassword || !removeConfirmationPassword.trim()}
                className="h-8 text-xs bg-red-600 hover:bg-red-500 text-white font-medium"
              >
                {isRemovingPassword ? <Loader2 className="size-3 animate-spin mr-1.5" /> : <Unlock className="size-3 mr-1.5" />}
                Remove Protection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
