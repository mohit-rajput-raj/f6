"use client";

import React from "react";
import dynamic from "next/dynamic";
import { NotificationSkeleton } from "./components/NotificationSkeleton";

// Dynamically import NotificationCenter for optimum performance
const NotificationCenter = dynamic(
  () => import("./components/NotificationCenter").then((mod) => mod.NotificationCenter),
  {
    loading: () => <NotificationSkeleton />,
    ssr: false,
  }
);

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <NotificationCenter />
    </div>
  );
}