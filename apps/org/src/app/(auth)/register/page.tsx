"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  IconLock,
  IconMail,
  IconUser,
  IconBuilding,
  IconArrowRight,
  IconShieldCheck,
  IconTrash,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import {
  registerOrganizerAction,
  terminateOrganizerRegistrationAction,
  OrganizerSessionUser,
} from "@/lib/organizer-auth";
import { useOrg } from "@/context/OrgContext";
import { registerSchema } from "@/lib/validations/auth";
import { OrganizationRegisterWizard } from "@/components/wizard/OrganizationRegisterWizard";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStep = searchParams.get("step");

  const { refresh, organizerUser, currentUser, selectOrg, allOrgs, isLoading } = useOrg();

  // State: "account" | "organization"
  const [step, setStep] = useState<"account" | "organization">(
    requestedStep === "org" ? "organization" : "account"
  );
  const [registeredUser, setRegisteredUser] = useState<OrganizerSessionUser | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  // Termination modal state
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminating, setTerminating] = useState(false);

  // If already logged in as organizer without any registered organization:
  // Resume directly on the 4-step organization setup wizard!
  useEffect(() => {
    if (!isLoading && organizerUser && allOrgs.length === 0) {
      setStep("organization");
    }
  }, [organizerUser, allOrgs.length, isLoading]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side Zod validation
    const validation = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: {
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
      } = {};

      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as keyof typeof fieldErrors;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }

      setErrors(fieldErrors);
      toast.error(validation.error.issues[0]?.message || "Please fix validation errors");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await registerOrganizerAction({
        name: name.trim(),
        email: cleanEmail,
        password,
        confirmPassword,
      });

      if (!res.ok) {
        toast.error(res.error || "Registration failed");
        setLoading(false);
        return;
      }

      toast.success("Organizer account created! Please complete your organization setup.");
      setRegisteredUser(res.user || null);
      await refresh();

      // Immediately transition directly to organization setup wizard on this page
      setStep("organization");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const activeUser = registeredUser || organizerUser || currentUser || {
    id: "temp-organizer",
    name: name || "Organizer",
    email: email || "organizer@unixl.io",
    role: "ORGANIZER",
  };

  // Handle Terminate Registration & Delete Account
  const handleTerminateRegistration = async () => {
    setTerminating(true);
    try {
      const res = await terminateOrganizerRegistrationAction(activeUser?.id);
      if (!res.ok) {
        toast.error(res.error || "Failed to terminate registration");
        setTerminating(false);
        return;
      }

      toast.success("Account and registration terminated. Email is now free to register again.");
      await refresh();
      setRegisteredUser(null);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setStep("account");
      setShowTerminateModal(false);
      router.replace("/register");
    } catch (err: any) {
      toast.error(err.message || "Termination failed");
    } finally {
      setTerminating(false);
    }
  };

  // ── PHASE 2: 4-Step Organization Register Wizard ──
  if (step === "organization") {
    return (
      <div className="w-full max-w-5xl py-2 space-y-4">
        {/* Active Account Resumption & Termination Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs backdrop-blur-sm gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              <IconUser className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {activeUser.name || "Organizer"}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  Organizer Account Created
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate block">
                {activeUser.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTerminateModal(true)}
              className="text-xs h-8 px-3 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors gap-1.5 cursor-pointer shadow-2xs"
            >
              <IconTrash className="size-3.5" />
              <span>Terminate & Delete Account</span>
            </Button>
          </div>
        </div>

        <div className="text-center space-y-1 mb-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Register Your Initial Organization
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
            At least one organization must be registered to initialize your executive workspace and enter the dashboard.
          </p>
        </div>

        <OrganizationRegisterWizard
          user={activeUser}
          onComplete={async (newOrg) => {
            await refresh();
            await selectOrg(newOrg);
            // Land on dashboard after filling organization form
            window.location.href = "/dashboard";
          }}
          onCancel={() => {
            // Clicking Cancel triggers the termination modal so user can cleanly discard
            setShowTerminateModal(true);
          }}
        />

        {/* ─── Terminate Registration Confirmation Modal ────────── */}
        {showTerminateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4">
              <div className="size-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                <IconAlertTriangle className="size-5" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Terminate Registration & Delete Account?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Are you sure you want to cancel setup? This will permanently delete your organizer account for{" "}
                  <strong className="text-neutral-800 dark:text-neutral-200">
                    {activeUser.email}
                  </strong>{" "}
                  and erase all pending configuration.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-800 dark:text-amber-300">
                Your email address will be completely released from the database, allowing you to register again from scratch whenever you choose.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={terminating}
                  onClick={() => setShowTerminateModal(false)}
                  className="text-xs h-8 px-3"
                >
                  Keep Setting Up
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={terminating}
                  onClick={handleTerminateRegistration}
                  className="text-xs h-8 px-3 gap-1.5"
                >
                  {terminating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Deleting Account...</span>
                    </>
                  ) : (
                    <>
                      <IconTrash className="size-3.5" />
                      <span>Yes, Terminate & Delete</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PHASE 1: Organizer Account Setup ──
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="size-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center mx-auto shadow-md">
          <IconBuilding className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Create Organizer Account
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Set up your executive workspace and departmental pipelines in minutes.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-6 sm:p-7 shadow-xl space-y-5">
        <form onSubmit={handleAccountSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Full Name *
            </label>
            <div className="relative">
              <IconUser className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Sarah Chen"
                className="pl-9 text-xs h-10"
              />
            </div>
            {errors.name && (
              <p className="text-[11px] text-red-500 font-medium">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Work Email *
            </label>
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="sarah.chen@enterprise.io"
                className="pl-9 text-xs h-10"
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-500 font-medium">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Password *
            </label>
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="At least 6 characters"
                className="pl-9 text-xs h-10"
              />
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 font-medium">{errors.password}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Confirm Password *
            </label>
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Re-enter your password"
                className="pl-9 text-xs h-10"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-500 font-medium">{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-xs h-10 font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 shadow-sm mt-2"
          >
            <span>{loading ? "Creating account..." : "Continue to Organization Setup"}</span>
            <IconArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </form>

        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <IconShieldCheck className="size-3.5 text-emerald-500" />
          <span>Institutional encryption & access management</span>
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-semibold text-neutral-900 dark:text-white hover:underline"
        >
          Sign in here
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-neutral-500">
          Loading registration...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
