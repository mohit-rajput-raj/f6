"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconLock,
  IconMail,
  IconArrowRight,
  IconBuilding,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import { loginOrganizerAction } from "@/lib/organizer-auth";
import { useOrg } from "@/context/OrgContext";
import { loginSchema } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useOrg();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side Zod validation
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(validation.error.issues[0]?.message || "Please check your inputs");
      return;
    }

    setLoading(true);
    try {
      const res = await loginOrganizerAction({
        email: email.trim(),
        password,
      });

      if (!res.ok) {
        toast.error(res.error || "Login failed");
        setLoading(false);
        return;
      }

      toast.success(`Welcome back, ${res.user?.name || "Organizer"}!`);
      await refresh();

      if (res.user?.activeOrganizationId) {
        router.push("/dashboard");
      } else {
        router.push("/register?step=org");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication error");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="size-12 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center mx-auto shadow-md">
          <IconBuilding className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Organizer Sign In
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Access your institutional desks, departmental pipelines, and team channels.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-6 sm:p-7 shadow-xl space-y-5">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Work Email
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
                placeholder="sarah.chen@apex.io"
                className="pl-9 text-xs h-10"
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-500 font-medium">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <span className="text-[10px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                Forgot password?
              </span>
            </div>
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
                placeholder="••••••••••••"
                className="pl-9 text-xs h-10"
              />
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 font-medium">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-xs h-10 font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 shadow-sm mt-1"
          >
            <span>{loading ? "Verifying..." : "Sign In as Organizer"}</span>
            <IconArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </form>

        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <IconShieldCheck className="size-3.5 text-emerald-500" />
          <span>Zero-trust institutional encryption active</span>
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500">
        Don&apos;t have an organization account yet?{" "}
        <Link
          href="/register"
          className="font-semibold text-neutral-900 dark:text-white hover:underline"
        >
          Create one now
        </Link>
      </p>
    </div>
  );
}

