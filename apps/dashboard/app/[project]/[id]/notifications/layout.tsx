"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Inbox, UserPlus, Sparkles } from "lucide-react";
import { Badge } from "@repo/ui/components/ui/badge";
import { NotificationErrorBoundary } from "./components/NotificationErrorBoundary";
import { NotificationSkeleton } from "./components/NotificationSkeleton";
import { fetchUnreadCount } from "@/lib/notifications-api";
import { useSession } from "@/lib/auth-client";


export default function NotificationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const pathname = usePathname() || "";
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const loadUnreadCount = useCallback(async () => {
        const activeUserId = session?.user?.id;
        if (!activeUserId) return;
        const count = await fetchUnreadCount(activeUserId);
        setUnreadCount(count);
    }, [session]);


    useEffect(() => {
        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 10000);
        return () => clearInterval(interval);
    }, [loadUnreadCount]);



    // Compute base notifications path dynamically (e.g., "/projects/[project]/[id]/notifications")
    const basePath = pathname.includes("/notifications")
        ? pathname.split("/notifications")[0] + "/notifications"
        : pathname;

    const isTabActive = (tabPath: string) => {
        if (tabPath === "") {
            return pathname === basePath || pathname === `${basePath}/`;
        }
        return pathname.startsWith(`${basePath}/${tabPath}`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 space-y-6 w-full mx-auto">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Bell className="size-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
                        <Badge variant="secondary" className="text-xs font-mono">
                            Live Hub
                        </Badge>
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs px-2 py-0.5 animate-pulse">
                                {unreadCount} New
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Manage alerts, system events, project workflow notifications, and workspace access requests.
                    </p>
                </div>

                {/* Navigation Sub-Tabs */}
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/40 shrink-0">
                    <Link
                        href={basePath}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${isTabActive("")
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Sparkles className="size-3.5" /> Overview
                    </Link>

                    <Link
                        href={`${basePath}/inbox`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${isTabActive("inbox")
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Inbox className="size-3.5" /> Inbox
                    </Link>

                    <Link
                        href={`${basePath}/request`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${isTabActive("request")
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <UserPlus className="size-3.5" /> Access Requests
                    </Link>
                </div>
            </div>

            {/* Main Content Area with Error Boundary and Suspense */}
            <NotificationErrorBoundary>
                <Suspense fallback={<NotificationSkeleton />}>
                    {children}
                </Suspense>
            </NotificationErrorBoundary>
        </div>
    );
}