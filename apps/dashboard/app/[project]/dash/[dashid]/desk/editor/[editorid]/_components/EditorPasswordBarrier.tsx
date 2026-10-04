"use client";

import React, { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@/components/ui/components";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditorPasswordBarrierProps {
  blockId: string;
  tabName: string;
  coOwnerEmail?: string | null;
  deskUrl: string;
  onUnlocked: () => void;
}

export function EditorPasswordBarrier({
  blockId,
  tabName,
  coOwnerEmail,
  deskUrl,
  onUnlocked,
}: EditorPasswordBarrierProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage("Password is required");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/desk/block/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, password: password.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Access authorized!");
        onUnlocked();
      } else {
        const msg = data.error || "Incorrect password. Access denied.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch {
      setErrorMessage("Failed to verify password");
      toast.error("Verification error");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-zinc-950 p-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Lock className="size-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Protected Block Editor</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Authentication required for <span className="text-amber-400 font-mono font-semibold">"{tabName}"</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
              <span>Security Password</span>
              {coOwnerEmail && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  Managed by: {coOwnerEmail.split("@")[0]}
                </span>
              )}
            </label>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter block security password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isVerifying}
                className="pl-9 pr-10 h-10 bg-zinc-950 border-zinc-700 text-sm focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1 animate-in fade-in">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-500">
            This block workflow editor is password-protected by the block co-owner. You must enter the security key every time you access this editor.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="w-full h-10 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Verifying...
                </>
              ) : (
                "Unlock & Open Editor"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(deskUrl)}
              className="w-full h-9 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <ArrowLeft className="size-3 mr-1.5" />
              Return to Desk
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
