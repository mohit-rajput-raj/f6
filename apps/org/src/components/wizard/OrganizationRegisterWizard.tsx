"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileText,
  Users,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  X,
  Link2,
  ExternalLink,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import { Organization } from "@/lib/organization-data";
import { orgApi } from "@/lib/org-api";
import { switchActiveOrganizationAction } from "@/lib/organizer-auth";
import { uploadImageAction } from "@/lib/image-upload";

interface OrganizationRegisterWizardProps {
  user: any;
  onComplete: (org: any) => void;
  onCancel: () => void;
}

export const OrganizationRegisterWizard: React.FC<OrganizationRegisterWizardProps> = ({
  user,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [departments, setDepartments] = useState("Operations, Engineering, Analytics");
  const [rules, setRules] = useState(
    "All desks and shared libraries under this organization are confidential\nStandard column formats apply across all assigned departmental desks"
  );

  // Logo file upload handler
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, SVG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);

    const toastId = toast.loading("Uploading organization logo...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadImageAction(formData);
      if (!res.ok || !res.url) {
        toast.error(res.error || "Failed to upload logo", { id: toastId });
        return;
      }

      setLogoUrl(res.url);
      toast.success("Organization logo uploaded successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Logo upload failed", { id: toastId });
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setOrgName(val);
    if (!orgSlug || orgSlug === orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setOrgSlug(val.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
  };


  const handleResetForm = () => {
    setOrgName("");
    setOrgSlug("");
    setTagline("");
    setDescription("");
    setLogoUrl("");
    setContactEmail(user?.email || "");
    setPhone("");
    setLocation("");
    setWebsite("");
    setDepartments("Operations, Engineering, Analytics");
    setRules(
      "All desks and shared libraries under this organization are confidential\nStandard column formats apply across all assigned departmental desks"
    );
    setCurrentStep(1);
    toast.info("Registration form reset");
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!orgName.trim()) {
        toast.error("Organization name is required");
        return false;
      }
      if (!orgSlug.trim()) {
        toast.error("Organization identifier (slug) is required");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!contactEmail.trim() || !contactEmail.includes("@")) {
        toast.error("A valid contact email is required");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedRules = rules
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      if (!user?.id) {
        toast.error("Please sign in as an organizer before creating an organization");
        setIsSubmitting(false);
        return;
      }

      const newOrg = await orgApi.createOrganization(user.id, {
        name: orgName.trim(),
        slug: orgSlug.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        logoUrl: logoUrl.trim() || undefined,
        contactEmail: contactEmail.trim(),
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        rules: parsedRules,
      });

      // Update active organization in session cookie
      try {
        await switchActiveOrganizationAction(newOrg.id);
      } catch (e) {
        console.warn("Session update notice:", e);
      }

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(`Organization "${newOrg.name}" initialized successfully!`);
      onComplete(newOrg);
    } catch (err: any) {
      toast.error(err.message || "Failed to create organization in database");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Identity & Brand", desc: "Name, slug, and branding" },
    { num: 2, title: "Contact & Location", desc: "Official presence" },
    { num: 3, title: "Operations & Governance", desc: "Desks and rules" },
    { num: 4, title: "Review & Provision", desc: "Launch workspace" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Sparkles className="size-3.5" />
            <span>Enterprise Organization Onboarding</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Create New Organization
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Establish a collaborative multi-desk workspace for institutional pipelines, member roles, and shared assets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetForm}
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <RotateCcw className="size-3.5 mr-1" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-xs border-neutral-200 dark:border-neutral-800"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Progress Steps Indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((s) => {
          const isDone = currentStep > s.num;
          const isCurrent = currentStep === s.num;
          return (
            <div
              key={s.num}
              onClick={() => {
                if (currentStep > s.num) setCurrentStep(s.num);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                isCurrent
                  ? "border-neutral-900 dark:border-neutral-100 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                  : isDone
                  ? "border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-400 bg-transparent"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Step {s.num}</span>
                {isDone && <CheckCircle2 className="size-3.5 text-emerald-500" />}
              </div>
              <div className="text-xs font-semibold mt-1 truncate">{s.title}</div>
              <div className="text-[10px] opacity-70 truncate">{s.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Wizard Content Layout: Form + Live Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Step Form Container */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm space-y-5">
          {/* STEP 1: IDENTITY & BRAND */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Step 1: Identity & Brand
                </h3>
                <p className="text-xs text-neutral-500">
                  Basic identifying traits for the organization directory and workspace branding.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Organization Name *
                </label>
                <Input
                  value={orgName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Apex Autonomous Systems"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  URL Identifier (Slug) *
                </label>
                <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-3 text-xs text-neutral-400">
                  <span>org.unixl.io/</span>
                  <input
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="apex-autonomous"
                    className="flex-1 bg-transparent p-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Tagline / Mission (One-liner)
                </label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Next-generation robotics & telemetry intelligence"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Detailed Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Summarize the core focus, departments, or transformation pipelines of this organization..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              {/* Organization Logo / Image Feature */}
              <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-neutral-400" />
                    Organization Logo / Brand Image
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="text-[11px] text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X className="size-3" />
                      Remove Image
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/60">
                  {/* Image Preview */}
                  <div className="shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Brand Logo Preview"
                        className="size-14 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs"
                      />
                    ) : (
                      <div className="size-14 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-bold text-xl shadow-xs">
                        {orgName ? orgName.charAt(0).toUpperCase() : "O"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shadow-2xs">
                        <Upload className="size-3.5" />
                        <span>Upload Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-neutral-400">or paste image link:</span>
                    </div>

                    <div className="relative">
                      <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
                      <Input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="pl-8 text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400">
                  Supports PNG, JPG, WebP, SVG (Max 2MB). Shown across your top navigation bar, directory cards, and desks.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT & PRESENCE */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Step 2: Contact & Presence
                </h3>
                <p className="text-xs text-neutral-500">
                  Official operational channels for member verification and support notices.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Mail className="size-3.5 text-neutral-400" />
                  Primary Contact Email *
                </label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ops@organization.com"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Phone className="size-3.5 text-neutral-400" />
                  Contact Telephone / Dispatch
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-neutral-400" />
                  Primary Office / Region
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA & Zurich, CH"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Globe className="size-3.5 text-neutral-400" />
                  Institutional Website
                </label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://apex-autonomous.io"
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 3: OPERATIONS & GOVERNANCE */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Step 3: Operations & Governance
                </h3>
                <p className="text-xs text-neutral-500">
                  Initial departments, pipeline governance, and compliance guidelines.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Users className="size-3.5 text-neutral-400" />
                  Operational Departments (Comma-separated)
                </label>
                <Input
                  value={departments}
                  onChange={(e) => setDepartments(e.target.value)}
                  placeholder="Operations, Robotics, Data Science, QA"
                  className="text-xs"
                />
                <span className="text-[10px] text-neutral-400">
                  These groups will appear in your Desk Assignment dropdowns.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <FileText className="size-3.5 text-neutral-400" />
                  Organization Rules & Standards (One per line)
                </label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  rows={4}
                  placeholder="Enter organization rules and requirements..."
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent p-2.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-neutral-400 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Built-in Enterprise Safeguards
                  </span>
                </div>
                <ul className="text-[11px] text-neutral-500 space-y-1 pl-6 list-disc">
                  <li>Automatic single-organization membership isolation</li>
                  <li>Initial owner assignment to <strong>{user.name}</strong> ({user.email})</li>
                  <li>Seed MasterSheet desk assignment automatically provisioned</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & PROVISION */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Step 4: Review & Enterprise Provisioning
                </h3>
                <p className="text-xs text-neutral-500">
                  Confirm your organization configuration before provisioning the live workspace.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Organization Name</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{orgName}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Brand Logo</span>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="size-7 rounded-md object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : (
                    <span className="text-neutral-400 font-mono text-[11px]">
                      Emblem ({orgName ? orgName.charAt(0).toUpperCase() : "O"})
                    </span>
                  )}
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Slug Identifier</span>
                  <span className="font-mono text-neutral-900 dark:text-neutral-100">@{orgSlug}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Executive Owner</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{user.name} ({user.email})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Contact Email</span>
                  <span className="text-neutral-900 dark:text-neutral-100">{contactEmail}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">HQ Location</span>
                  <span className="text-neutral-900 dark:text-neutral-100">{location || "Distributed"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Active Rules</span>
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {rules.split("\n").filter(Boolean).length} configured policy item(s)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="text-xs"
              >
                <ArrowLeft className="size-3.5 mr-1.5" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                size="sm"
                onClick={handleNext}
                className="text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
              >
                Continue
                <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                {isSubmitting ? "Provisioning..." : "Launch Organization Workspace"}
              </Button>
            )}
          </div>
        </div>

        {/* Live Interactive Preview Card */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Live Directory Preview
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="size-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700"
                />
              ) : (
                <div className="size-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-lg">
                  {orgName ? orgName.charAt(0).toUpperCase() : "O"}
                </div>
              )}
              <div>
                <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  {orgName || "Organization Name"}
                </h4>
                <span className="text-[11px] font-mono text-neutral-400">
                  @{orgSlug || "org-slug"}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {tagline || description || "Your organization tagline and mission summary will display here."}
            </p>

            <div className="space-y-1 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3 text-neutral-400" />
                <span>{location || "Location pending"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="size-3 text-neutral-400 shrink-0" />
                <a
                  href={website ? (website.startsWith("http") ? website : `https://${website}`) : "https://organization.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-emerald-500 transition-colors truncate max-w-[200px] flex items-center gap-1"
                >
                  <span>{website || "https://organization.com"}</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="size-3 text-neutral-400" />
                <span>1 Initial Member (You as Owner)</span>
              </div>
            </div>

            <div className="pt-2">
              <Badge className="w-full justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-1">
                Ready to Provision
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
