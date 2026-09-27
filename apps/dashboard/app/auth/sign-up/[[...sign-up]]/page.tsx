'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui/components';
import { signUp, signIn } from '@/lib/auth-client';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@repo/ui/components/ui/field';
import { cn } from '@repo/ui/lib/utils';
import { IconBrandGoogle } from '@tabler/icons-react';
import { VerifyEmailForm } from '../../verify-email/page';
import { sendVerificationOtpAction } from '../../actions';
import img from "./image.png";

export default function SignUpPage() {
  return <SignUpPageLayout />;
}

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<"register" | "verify">("register");
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  const handleGoogleSignUp = async () => {
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

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setEmailLoading(false);
      return;
    }

    try {
      await signUp.email({
        name,
        email,
        password,
      }, {
        onSuccess: async () => {
          setRegisteredEmail(email);
          // Automatically trigger sending the OTP code to their verification table
          try {
            await sendVerificationOtpAction(email);
          } catch (e) {
            console.warn("Could not pre-send OTP:", e);
          }
          // Switch to verification tab
          setAuthMode("verify");
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Failed to sign up');
        }
      });
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setEmailLoading(false);
    }
  };

  // If in verify mode, render the verification tab
  if (authMode === "verify") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Step 2: Verify Your Email
          </span>
          <button
            type="button"
            onClick={() => setAuthMode("register")}
            className="text-xs text-primary hover:underline font-medium"
          >
            ← Back
          </button>
        </div>

        <VerifyEmailForm
          initialEmail={registeredEmail}
          onVerified={() => {
            router.push(`/auth/sign-in?verified=true&email=${encodeURIComponent(registeredEmail)}`);
          }}
        />
      </div>
    );
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleEmailSignUp} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your details below to create your account
          </p>
        </div>
        {error && <div className="text-sm font-medium text-destructive text-red-500 text-center">{error}</div>}

        <Field>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input id="name" name="name" type="text" placeholder="John Doe" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
          <Input id="confirmPassword" name="confirmPassword" type="password" required />
        </Field>

        <Field>
          <Button type="submit" disabled={emailLoading || loading}>
            {emailLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button variant="outline" type="button" onClick={handleGoogleSignUp} disabled={loading || emailLoading}>
            <IconBrandGoogle className="mr-2 h-4 w-4" />
            {loading ? 'Redirecting...' : 'Sign Up with Google'}
          </Button>
          <FieldDescription className="text-center pt-2">
            Already have an account?{" "}
            <a href="/auth/sign-in" className="underline underline-offset-4">
              Sign in
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}

export const SignUpPageLayout = () => {
  return (
    <div className="grid w-full h-full lg:grid-cols-2 min-h-screen">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <SignUpForm />
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