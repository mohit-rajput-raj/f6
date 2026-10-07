"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Button } from "@/components/ui/components";
import { Lock, KeyRound, Eye, EyeOff, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { verifyBlockPassword } from "../desk-block-actions";

interface BlockPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockId: string;
  tabName: string;
  coOwnerEmail?: string | null;
  onVerified: (token?: string) => void;
}

export function BlockPasswordModal({
  isOpen,
  onClose,
  blockId,
  tabName,
  coOwnerEmail,
  onVerified,
}: BlockPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setErrorMessage(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setErrorMessage("Please enter the security password");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // ─── Backend API Verification (never checked on frontend) ───
      const res = await fetch("/api/desk/block/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Access authorized!");
        onVerified(data.token);
        onClose();
      } else {
        const msg = data.error || data.message || "Invalid password. Access denied.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      // Fallback to direct server action verification
      try {
        const actionRes = await verifyBlockPassword(blockId, password.trim());
        if (actionRes.success) {
          toast.success("Access authorized!");
          onVerified(actionRes.token);
          onClose();
          return;
        }
        setErrorMessage(actionRes.message || "Invalid password");
        toast.error(actionRes.message || "Invalid password");
      } catch (actionErr: any) {
        setErrorMessage(actionErr?.message || "Failed to verify password");
        toast.error("Verification failed");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 border-border bg-card text-card-foreground shadow-2xl overflow-hidden rounded-2xl">
        {/* Glowing Top Banner */}
        <div className="relative h-20 bg-muted/40 flex items-center px-6 border-b border-border">
          <div className="size-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md mr-3.5">
            <Lock className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-1.5">
              Protected Editor Access
            </h3>
            <p className="text-xs text-muted-foreground">
              Authentication required for <span className="text-amber-500 font-medium font-mono">"{tabName}"</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Security Password</span>
              {coOwnerEmail && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  Managed by: {coOwnerEmail.split("@")[0]}
                </span>
              )}
            </label>

            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                placeholder="Enter block security password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isVerifying}
                className="pl-9 pr-10 h-10 bg-background border-input focus:border-primary text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-destructive mt-1 animate-in fade-in">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            This workflow editor is protected by the block co-owner. You must enter the security key every time you access this editor.
          </p>

          <DialogFooter className="pt-2 sm:space-x-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isVerifying}
              className="h-9 border-border text-foreground hover:bg-muted text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isVerifying || !password.trim()}
              className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4 rounded-xl"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Unlock & Open</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
