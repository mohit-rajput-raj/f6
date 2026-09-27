'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@/components/ui/components';
import { signIn } from '@/lib/auth-client';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@repo/ui/components/ui/field';
import { cn } from '@repo/ui/lib/utils';
import { IconBrandGoogle, IconAlertCircle, IconCheck, IconMailCheck } from '@tabler/icons-react';
import { VerifyEmailForm } from '../../verify-email/page';
import img from "./image.png";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const verifiedParam = searchParams?.get("verified") === "true";
  const emailParam = searchParams?.get("email") || "";

  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "verify">(
    searchParams?.get("tab") === "verify" ? "verify" : "login"
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn.social({
        provider: 'google',
      }, {
        onSuccess: () => {
          router.push('/');
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);

    try {
      await signIn.email({
        email,
        password,
      }, {
        onSuccess: () => {
          router.push('/');
        },
        onError: (ctx) => {
          const msg = ctx.error.message || 'Invalid email or password';
          setError(msg);

          // Check if unverified error
          if (
            msg.toLowerCase().includes("not verified") ||
            msg.toLowerCase().includes("verify your email") ||
            (ctx.error as any).code === "EMAIL_NOT_VERIFIED"
          ) {
            setUnverifiedEmail(email);
            // Switch automatically to the verify tab so user can verify immediately
            setAuthMode("verify");
          }
        }
      });
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred';
      setError(msg);
      if (msg.toLowerCase().includes("not verified")) {
        setUnverifiedEmail(email);
        setAuthMode("verify");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // If in verify mode, render the verification form tab
  if (authMode === "verify") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {/* Tab switcher */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Verification Tab
          </span>
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            className="text-xs text-primary hover:underline font-medium"
          >
            ← Back to Login
          </button>
        </div>

        <VerifyEmailForm
          initialEmail={unverifiedEmail || email}
          onVerified={() => {
            setAuthMode("login");
            setError(null);
          }}
        />
      </div>
    );
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleEmailSignIn} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>

        {verifiedParam && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <IconCheck className="size-4 shrink-0" />
            <span>Email verified successfully! Please enter your password to login.</span>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-destructive text-red-500 text-center">
              {error}
            </div>

            {/* Unverified CTA banner */}
            {(error.toLowerCase().includes("not verified") || unverifiedEmail) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center space-y-2">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Your account requires email verification.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAuthMode("verify")}
                  className="w-full text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <IconMailCheck className="mr-1.5 size-3.5" />
                  Verify Email Now (OTP or Link)
                </Button>
              </div>
            )}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="m@example.com"
            required
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Field>
          <Button type="submit" disabled={emailLoading || loading}>
            {emailLoading ? 'Logging in...' : 'Login'}
          </Button>
        </Field>

        <FieldSeparator>Or continue with</FieldSeparator>

        <Field>
          <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={loading || emailLoading}>
            <IconBrandGoogle className="mr-2 h-4 w-4" />
            {loading ? 'Redirecting...' : 'Login with Google'}
          </Button>

          <FieldDescription className="text-center pt-2">
            Don&apos;t have an account?{" "}
            <a href="/auth/sign-up" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}

export const LoginPage = () => {
  return (
    <div className="grid w-full h-full lg:grid-cols-2 min-h-screen">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted/80 relative hidden lg:block">
        <img
          src={img.src || "/placeholder.svg"}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
};
