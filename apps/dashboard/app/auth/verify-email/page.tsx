"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui/components";
import { Field, FieldGroup, FieldLabel } from "@repo/ui/components/ui/field";
import { cn } from "@repo/ui/lib/utils";
import { toast } from "sonner";
import {
  IconMailCheck,
  IconSend,
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconShieldLock,
  IconSparkles,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import {
  sendVerificationOtpAction,
  verifyEmailOtpAction,
  getLatestDevOtpAction,
  directVerifyEmailByAddress,
} from "../actions";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <VerifyEmailLayout />
    </Suspense>
  );
}

function VerifyEmailLayout() {
  return (
    <div className="grid w-full h-full lg:grid-cols-2 min-h-screen">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <VerifyEmailForm />
          </div>
        </div>
      </div>
      <div className="bg-muted/80 relative hidden lg:flex flex-col items-center justify-center p-12 bg-neutral-900 border-l border-neutral-800 text-white">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
            <IconShieldLock className="size-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Email Verification Security</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Protecting your workflows and automation assets requires a verified email address.
            Use the one-time passcode or verification link sent to your inbox to continue.
          </p>
        </div>
      </div>
    </div>
  );
}

export function VerifyEmailForm({
  initialEmail,
  onVerified,
  className,
  ...props
}: {
  initialEmail?: string;
  onVerified?: () => void;
  className?: string;
} & React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlEmail = searchParams?.get("email") || "";
  const urlToken = searchParams?.get("token") || "";

  const [email, setEmail] = useState<string>(initialEmail || urlEmail);
  const [code, setCode] = useState<string>(urlToken || "");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (urlToken && (email || urlEmail)) {
      handleVerify(urlToken, email || urlEmail);
    }
  }, [urlToken]);

  // Initial dev token fetch & resend cooldown ticker
  useEffect(() => {
    if (email && email.includes("@")) {
      getLatestDevOtpAction(email).then((res) => {
        if (res.success && res.code) {
          setDevCode(res.code);
        }
      });
    }
  }, [email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setSendingCode(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Send OTP via server action
      const res = await sendVerificationOtpAction(email);

      // 2. Also trigger Better-Auth verification link
      if ((authClient as any)?.sendVerificationEmail) {
        try {
          await (authClient as any).sendVerificationEmail({
            email,
            callbackURL: window.location.origin + "/auth/sign-in",
          });
        } catch (e) {
          console.warn("Better auth client link trigger:", e);
        }
      }

      if (res.success) {
        if (res.alreadyVerified) {
          setSuccessMessage("Your email is already verified! You can now log in.");
          toast.success("Account is already verified");
        } else {
          setSuccessMessage(`Verification code sent to ${email}`);
          toast.success(`Verification email sent to ${email}`);
          if (res.devCode) {
            setDevCode(res.devCode);
            setCode(res.devCode);
          }
          setResendCooldown(60);
        }
      } else {
        setError(res.error || "Failed to send verification email");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong sending the code");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async (codeToVerify?: string, emailToVerify?: string) => {
    const targetEmail = (emailToVerify || email).trim();
    const targetCode = (codeToVerify || code).trim();

    if (!targetEmail) {
      setError("Email address is required");
      return;
    }
    if (!targetCode) {
      setError("Please enter the 6-digit verification code or token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyEmailOtpAction(targetEmail, targetCode);
      if (res.success) {
        setSuccessMessage("Email verified successfully!");
        toast.success("Email verified successfully! You can now log in.");

        if (onVerified) {
          onVerified();
        } else {
          setTimeout(() => {
            router.push(`/auth/sign-in?verified=true&email=${encodeURIComponent(targetEmail)}`);
          }, 1200);
        }
      } else {
        setError(res.error || "Invalid or expired verification code");
      }
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantBypass = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }
    setLoading(true);
    try {
      const res = await directVerifyEmailByAddress(email);
      if (res.success) {
        toast.success("Email verified instantly (Dev mode)!");
        if (onVerified) {
          onVerified();
        } else {
          router.push(`/auth/sign-in?verified=true&email=${encodeURIComponent(email)}`);
        }
      } else {
        setError(res.error || "Dev verification failed");
      }
    } catch (err: any) {
      setError(err?.message || "Dev verify failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <IconMailCheck className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-muted-foreground text-xs text-balance max-w-xs">
            Enter your 6-digit code or request a verification link to activate your account.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <IconAlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <IconCheck className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="verify-email">Email Address</FieldLabel>
          <Input
            id="verify-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="m@example.com"
            required
            disabled={loading || sendingCode}
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="verify-code">Verification Code (OTP)</FieldLabel>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || resendCooldown > 0}
              className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
            >
              {sendingCode
                ? "Sending..."
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Send Code / Link"}
            </button>
          </div>
          <div className="relative">
            <Input
              id="verify-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 123456"
              maxLength={36}
              className="font-mono tracking-widest text-center text-sm uppercase"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleVerify();
                }
              }}
            />
            {devCode && (
              <button
                type="button"
                onClick={() => setCode(devCode)}
                className="absolute right-2 top-2 text-[10px] text-primary hover:underline font-mono bg-primary/10 px-1.5 py-0.5 rounded"
              >
                Use Code: {devCode}
              </button>
            )}
          </div>

          {devCode && (
            <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs space-y-1 text-left">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-700 dark:text-amber-400">Development OTP Code:</span>
                <span className="font-mono font-bold tracking-widest text-amber-800 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                  {devCode}
                </span>
              </div>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                Real emails to Gmail require setting <code className="font-mono font-semibold">RESEND_API_KEY</code> in your <code className="font-mono">.env</code>. The code above is ready to verify!
              </p>
            </div>
          )}
        </Field>

        <Field className="space-y-2">
          <Button
            type="button"
            onClick={() => handleVerify()}
            disabled={loading || !code.trim()}
            className="w-full font-medium"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>

          {/* Dev Mode instant shortcut */}
          <Button
            type="button"
            variant="outline"
            onClick={handleInstantBypass}
            disabled={loading || !email}
            className="w-full text-xs text-muted-foreground border-dashed hover:text-foreground"
          >
            <IconSparkles className="mr-1.5 size-3 text-amber-500" />
            Instant Dev Verify (1-Click)
          </Button>
        </Field>

        <div className="text-center pt-2">
          <a
            href="/auth/sign-in"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            <IconArrowLeft className="size-3.5" />
            Back to Sign In
          </a>
        </div>
      </FieldGroup>
    </div>
  );
}
