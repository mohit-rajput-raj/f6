"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Building,
  ShieldCheck,
  Trash2,
  Upload,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Camera,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { useOrg } from "@/context/OrgContext";
import { supabase } from "@repo/db";
import { updateOrganizerProfileAction } from "@/lib/organizer-auth";
import { uploadImageAction } from "@/lib/image-upload";
import { orgApi } from "@/lib/org-api";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "profile" ? "profile" : "organization";

  const { activeOrg, organizerUser, updateOrg, leaveCurrentOrg, refresh } = useOrg();

  const [activeTab, setActiveTab] = useState<"profile" | "organization" | "governance" | "danger">(
    initialTab as any
  );

  // ── Organizer Profile State ──
  const [organizerName, setOrganizerName] = useState(organizerUser?.name || "");
  const [organizerAvatar, setOrganizerAvatar] = useState(organizerUser?.avatar || "/pfpImage.png");
  const [savingOrganizer, setSavingOrganizer] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organizerUser) {
      setOrganizerName(organizerUser.name || "");
      setOrganizerAvatar(organizerUser.avatar || "/pfpImage.png");
    }
  }, [organizerUser]);

  // Handle Avatar file upload via Cloudinary action
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar image size must be under 5MB");
      return;
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setOrganizerAvatar(previewUrl);

    setUploadingAvatar(true);
    const toastId = toast.loading("Uploading avatar...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadImageAction(formData);

      if (!res.ok || !res.url) {
        toast.error(res.error || "Failed to upload image", { id: toastId });
        setUploadingAvatar(false);
        return;
      }

      setOrganizerAvatar(res.url);
      toast.success("Avatar uploaded! Click 'Save Profile Changes' to commit.", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: toastId });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveOrganizerProfile = async () => {
    if (!organizerName.trim()) {
      toast.error("Organizer name cannot be blank");
      return;
    }

    setSavingOrganizer(true);
    try {
      const res = await updateOrganizerProfileAction({
        name: organizerName.trim(),
        avatar: organizerAvatar,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to update organizer profile");
        return;
      }

      await refresh();
      toast.success("Organizer profile & avatar successfully updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingOrganizer(false);
    }
  };

  // ── Organization Profile State ──
  const [settingsName, setSettingsName] = useState(activeOrg?.name || "");
  const [settingsTagline, setSettingsTagline] = useState(activeOrg?.tagline || "");
  const [settingsWebsite, setSettingsWebsite] = useState(activeOrg?.website || "");
  const [settingsEmail, setSettingsEmail] = useState(activeOrg?.contactEmail || "");
  const [settingsPhone, setSettingsPhone] = useState(activeOrg?.phone || "");
  const [settingsLocation, setSettingsLocation] = useState(activeOrg?.location || "");
  const [newRuleInput, setNewRuleInput] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    if (activeOrg) {
      setSettingsName(activeOrg.name || "");
      setSettingsTagline(activeOrg.tagline || "");
      setSettingsWebsite(activeOrg.website || "");
      setSettingsEmail(activeOrg.contactEmail || "");
      setSettingsPhone(activeOrg.phone || "");
      setSettingsLocation(activeOrg.location || "");
    }
  }, [activeOrg]);

  const handleSaveOrgProfile = async () => {
    if (!activeOrg) return;
    setSavingOrg(true);
    try {
      const updatedFields = {
        name: settingsName.trim() || activeOrg.name,
        tagline: settingsTagline.trim(),
        website: settingsWebsite.trim(),
        contactEmail: settingsEmail.trim() || activeOrg.contactEmail,
        phone: settingsPhone.trim(),
        location: settingsLocation.trim(),
      };

      const { error } = await supabase
        .from("organization")
        .update(updatedFields)
        .eq("id", activeOrg.id);

      if (error) throw error;

      updateOrg({
        ...activeOrg,
        ...updatedFields,
      });
      toast.success("Organization profile saved successfully to database");
    } catch (err: any) {
      toast.error(err.message || "Failed to save organization settings");
    } finally {
      setSavingOrg(false);
    }
  };

  const handleAddRule = () => {
    if (!activeOrg || !newRuleInput.trim()) return;
    updateOrg({
      ...activeOrg,
      rules: [...(activeOrg.rules || []), newRuleInput.trim()],
    });
    setNewRuleInput("");
    toast.success("Rule added to governance policy");
  };

  const handleRemoveRule = (index: number) => {
    if (!activeOrg) return;
    const updated = [...(activeOrg.rules || [])];
    updated.splice(index, 1);
    updateOrg({
      ...activeOrg,
      rules: updated,
    });
    toast.info("Rule removed");
  };

  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [submittingDeletion, setSubmittingDeletion] = useState(false);

  const handleRequestOrgDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    if (!deletionReason.trim()) {
      toast.error("Please provide a reason for the deletion request.");
      return;
    }

    setSubmittingDeletion(true);
    try {
      await orgApi.requestOrganizationDeletion({
        orgId: activeOrg.id,
        reason: deletionReason.trim(),
        requesterEmail: organizerUser?.email || activeOrg.ownerEmail || "",
      });

      updateOrg({
        ...activeOrg,
        status: "PENDING_DELETION",
        deletionRequestedAt: new Date().toISOString(),
        deletionReason: deletionReason.trim(),
        deletionRequestedBy: organizerUser?.email || activeOrg.ownerEmail || "",
      });

      setShowDeleteOrgModal(false);
      setDeletionReason("");
      toast.success("Organization deletion request submitted. An admin will review and approve the request.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit deletion request");
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const handleCancelOrgDeletion = async () => {
    if (!activeOrg) return;
    if (!confirm("Are you sure you want to cancel the deletion request for this organization?")) return;

    setSubmittingDeletion(true);
    try {
      await orgApi.cancelOrganizationDeletionRequest(
        activeOrg.id,
        organizerUser?.email || activeOrg.ownerEmail || ""
      );

      updateOrg({
        ...activeOrg,
        status: "ACTIVE",
        deletionRequestedAt: null,
        deletionReason: null,
        deletionRequestedBy: null,
      });

      toast.info("Organization deletion request cancelled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel deletion request");
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const handleLeaveOrganization = () => {
    leaveCurrentOrg();
    toast.info("Left active organization. You are now in solo mode.");
    router.push("/explore");
  };

  return (
    <div className="space-y-6 w-full max-w-full px-4 sm:px-6 lg:px-8 py-4">
      {/* Header and Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Settings & Account Governance
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your organizer identity, personal avatar, institutional parameters, and security policies.
        </p>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === "profile"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white bg-neutral-100/60 dark:bg-neutral-800/40"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
          }`}
        >
          <User className="size-3.5" />
          <span>Organizer Profile</span>
          <Badge className="ml-1 text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
            Handler
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("organization")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === "organization"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white bg-neutral-100/60 dark:bg-neutral-800/40"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
          }`}
        >
          <Building className="size-3.5" />
          <span>Organization Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("governance")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === "governance"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white bg-neutral-100/60 dark:bg-neutral-800/40"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
          }`}
        >
          <ShieldCheck className="size-3.5" />
          <span>Governance & Policies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("danger")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ml-auto ${
            activeTab === "danger"
              ? "border-red-500 text-red-600 dark:text-red-400 bg-red-500/5"
              : "border-transparent text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
          }`}
        >
          <AlertTriangle className="size-3.5" />
          <span>Danger Zone</span>
        </button>
      </div>

      {/* ── TAB 1: Organizer Profile Settings ── */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <User className="size-4 text-emerald-500" />
                  <span>Organizer Persona & Avatar</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Your identity as the organization handler across all pipelines and desks.
                </p>
              </div>

              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs py-0.5 px-2.5 font-medium">
                <CheckCircle2 className="size-3 mr-1 inline" />
                Verified Organizer
              </Badge>
            </div>

            {/* Avatar Management Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="relative group shrink-0">
                <img
                  src={organizerAvatar || "/pfpImage.png"}
                  alt={organizerName || "Organizer"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/pfpImage.png";
                  }}
                  className="size-24 rounded-2xl object-cover border-2 border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-800"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload new avatar image"
                  className="absolute inset-0 rounded-2xl bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer gap-1"
                >
                  <Camera className="size-5" />
                  <span className="text-[10px] font-semibold">Change</span>
                </button>
              </div>

              <div className="space-y-2.5 flex-1 text-center sm:text-left">
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Profile Avatar
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Upload an avatar image (PNG, JPG, SVG, WebP, max 2MB). If none is uploaded, the default executive avatar is used.
                  </p>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-8 px-3 gap-1.5"
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" />
                        <span>Upload Image</span>
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOrganizerAvatar("/pfpImage.png");
                      toast.info("Avatar reset to default placeholder. Save to commit.");
                    }}
                    className="text-xs h-8 px-3 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    <RefreshCw className="size-3 mr-1" />
                    <span>Reset to Default</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Profile Form Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name *
                </label>
                <Input
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Organizer Work Email (Account Identifier)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
                  <Input
                    value={organizerUser?.email || ""}
                    disabled
                    className="pl-8 text-xs h-9 opacity-75 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Organizer System Role
                </label>
                <Input
                  value={organizerUser?.role || "ORGANIZER (Executive Owner)"}
                  disabled
                  className="text-xs h-9 opacity-75 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Account Identifier (UUID)
                </label>
                <Input
                  value={organizerUser?.id || "N/A"}
                  disabled
                  className="text-xs h-9 font-mono opacity-75 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800/50"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <Button
                size="sm"
                disabled={savingOrganizer}
                onClick={handleSaveOrganizerProfile}
                className="text-xs font-semibold h-9 px-5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
              >
                {savingOrganizer ? "Saving Changes..." : "Save Profile Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Organization Profile Settings ── */}
      {activeTab === "organization" && (
        <div className="space-y-6">
          {!activeOrg ? (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center space-y-3">
              <Building className="size-8 text-neutral-400 mx-auto" />
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                No Active Organization Selected
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Please register an organization or select one from the directory to manage organization settings.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Building className="size-4 text-emerald-500" />
                  <span>General Organization Profile</span>
                </h3>

                {activeOrg.website && (
                  <a
                    href={activeOrg.website.startsWith("http") ? activeOrg.website : `https://${activeOrg.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Globe className="size-3.5" />
                    <span>Visit Website</span>
                    <ExternalLink className="size-3 opacity-70" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Organization Name
                  </label>
                  <Input
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    URL Slug (Immutable)
                  </label>
                  <Input value={activeOrg.slug} disabled className="text-xs opacity-70 cursor-not-allowed" />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Mission Tagline
                  </label>
                  <Input
                    value={settingsTagline}
                    onChange={(e) => setSettingsTagline(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Contact Email
                  </label>
                  <Input
                    value={settingsEmail}
                    onChange={(e) => setSettingsEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Official Website
                  </label>
                  <Input
                    value={settingsWebsite}
                    onChange={(e) => setSettingsWebsite(e.target.value)}
                    placeholder="https://organization.com"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    HQ Location
                  </label>
                  <Input
                    value={settingsLocation}
                    onChange={(e) => setSettingsLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Contact Phone
                  </label>
                  <Input
                    value={settingsPhone}
                    onChange={(e) => setSettingsPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={savingOrg}
                  onClick={handleSaveOrgProfile}
                  className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                >
                  {savingOrg ? "Saving Changes..." : "Save Organization Changes"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Governance Policies ── */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          {!activeOrg ? (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center text-xs text-neutral-500">
              No active organization selected.
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <ShieldCheck className="size-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Governance Policies & Schema Constraints
                </h3>
              </div>

              <div className="space-y-2">
                {(activeOrg.rules || []).map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 text-xs"
                  >
                    <span className="text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
                      {rule}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRule(idx)}
                      className="text-xs h-7 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  placeholder="Add a new schema constraint or compliance policy..."
                  className="text-xs h-9"
                />
                <Button
                  size="sm"
                  onClick={handleAddRule}
                  className="text-xs h-9 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                >
                  Add Rule
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: Danger Zone ── */}
      {activeTab === "danger" && (
        <div className="space-y-6">
          {!activeOrg ? (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center text-xs text-neutral-500">
              No active organization selected.
            </div>
          ) : (
            <>
              {/* Deletion Request Status / Action Banner */}
              {activeOrg.status === "PENDING_DELETION" ? (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 shadow-xs space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          Organization Deletion Pending Admin Approval
                        </h4>
                        <Badge className="bg-amber-500 text-white text-[9px] py-0 px-2 font-bold">
                          PENDING APPROVAL
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300">
                        Your request to delete <strong>{activeOrg.name}</strong> is currently queued for Super Admin review. You can withdraw this request at any time prior to approval.
                      </p>
                      {activeOrg.deletionReason && (
                        <p className="text-xs text-neutral-500 italic pt-1">
                          Reason: &ldquo;{activeOrg.deletionReason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submittingDeletion}
                      onClick={handleCancelOrgDeletion}
                      className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                    >
                      {submittingDeletion ? "Cancelling..." : "Cancel Deletion Request"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.03] p-6 shadow-xs space-y-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="size-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-600 dark:text-red-400">
                        Delete Organization (Requires Admin Approval)
                      </h4>
                      <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                        Submit a formal decommission request for <strong>{activeOrg.name}</strong>. Once approved by a platform administrator, all associated desk groups, workflows, master sheets, and member links will be permanently and irrevocably deleted.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteOrgModal(true)}
                      className="text-xs font-semibold gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Request Organization Deletion</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Leave Organization Context */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>Leave Organization Workspace</span>
                </h4>
                <p className="text-xs text-neutral-500">
                  Switch away from this organization context. You can re-enter or switch between organizations at any time from the top navigation.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeaveOrganization}
                    className="text-xs text-neutral-700 dark:text-neutral-300"
                  >
                    Leave Organization Context
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Delete Organization Request Modal */}
      {showDeleteOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="size-5" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Request Organization Deletion
              </h3>
            </div>

            <p className="text-xs text-neutral-500">
              Please state why you want to delete <strong>{activeOrg?.name}</strong>. A platform administrator will review this request before all workflows and group desks are permanently wiped.
            </p>

            <form onSubmit={handleRequestOrgDeletion} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Reason for Decommissioning *
                </label>
                <textarea
                  required
                  rows={3}
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="e.g. End of academic semester, operational restructuring, test workspace cleanup..."
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-3 text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteOrgModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={submittingDeletion}
                  className="text-xs font-semibold"
                >
                  {submittingDeletion ? "Submitting..." : "Submit Deletion Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-neutral-500">
          Loading settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
