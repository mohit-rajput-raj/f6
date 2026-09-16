import React from "react";
import Link from "next/link";
import { HelpCircle, ArrowLeft, BookOpen, MessageSquare, Mail } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

export default function HelpPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-28 px-4 sm:px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="size-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary mx-auto shadow-sm">
          <BookOpen className="size-6 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Documentation & Support
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Our comprehensive documentation, API reference guides, and enterprise support portal are currently undergoing scheduled maintenance.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-xs text-zinc-400 space-y-2 text-left">
          <div className="flex items-center gap-2 font-mono text-zinc-300 font-semibold">
            <Mail className="size-3.5 text-primary" />
            <span>Need immediate enterprise assistance?</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Reach out directly to our engineering desk at{" "}
            <a
              href="mailto:support@unixl.io"
              className="text-primary hover:underline"
            >
              support@unixl.io
            </a>
            . Typical response time is under 15 minutes.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Overview</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
