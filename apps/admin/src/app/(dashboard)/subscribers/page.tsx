import React from "react";

export default function SubscribersPage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Subscribers
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Manage subscriptions, plans, and subscriber details.
        </p>
      </div>
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
        <span className="text-sm text-neutral-400">Subscribers content</span>
      </div>
    </div>
  );
}
