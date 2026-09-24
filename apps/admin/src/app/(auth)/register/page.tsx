"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  checkAdminExists,
  registerAdmin,
  getAdminSession,
} from "../_actions/admin-auth";
import {
  Shield,
  KeyRound,
  Lock,
  Mail,
  User,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

export default function RegisterAdminPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<"checking" | "ready" | "locked">("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passkey, setPasskey] = useState("");

  // Check if session exists or if admin already exists
  useEffect(() => {
    async function initCheck() {
      // If already logged in, go to dashboard
      const session = await getAdminSession();
      if (session?.user) {
        router.replace("/dashboard");
        return;
      }

      // Check if an admin account is already created
      const { exists } = await checkAdminExists();
      if (exists) {
        setPageState("locked");
        setTimeout(() => router.replace("/login"), 1500);
      } else {
        setPageState("ready");
      }
    }

    initCheck();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerAdmin({
        name,
        email,
        password,
        passkey,
      });

      if (!res.ok) {
        setError(res.error || "Failed to create administrator account.");
        setLoading(false);
        return;
      }

      // Success -> navigate to admin dashboard
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during registration.");
      setLoading(false);
    }
  };

  // ── Loading state ──
  if (pageState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  // ── Locked state: Admin already exists ──
  if (pageState === "locked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Admin Already Initialised
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            The master administrator account is already configured. Registration is permanently closed. Redirecting to login…
          </p>
          <div className="mt-5">
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-medium text-neutral-800 underline hover:text-black dark:text-neutral-300 dark:hover:text-white"
            >
              Go to Login now &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready state: Initial Setup Form ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white shadow dark:bg-neutral-100 dark:text-neutral-900">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Initialise Administrator
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            One-time portal setup. Once created, this registration gate locks permanently.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Administrator Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Administrator Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mohit Rajput"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password (min 8 chars)"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Master Passkey */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Master Passkey
              </label>
              <span className="text-[10px] text-neutral-400">
                System Authorization Key
              </span>
            </div>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input
                type="password"
                required
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="System admin passkey"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm font-mono text-neutral-900 placeholder:text-neutral-400 placeholder:font-sans outline-none transition focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating administrator account…
              </>
            ) : (
              "Initialise Admin Account"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-neutral-700 underline hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
