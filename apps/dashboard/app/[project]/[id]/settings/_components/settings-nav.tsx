"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  IconUser,
  IconBuilding,
  IconPalette,
  IconKey,
  IconBell,
  IconCreditCard,
  IconShieldLock,
} from "@tabler/icons-react";
import { cn } from "@repo/ui/lib/utils";

export function SettingsNav() {
  const pathname = usePathname();
  const params = useParams();
  
  const project = params?.project || "projects";
  const id = params?.id || "0";

  const basePath = `/${project}/${id}/settings`;

  const navSections = [
    {
      title: "General Settings",
      items: [
        {
          title: "Profile",
          href: `${basePath}/general/profile`,
          icon: IconUser,
          description: "Name, email, and profile avatar",
        },
        {
          title: "Workspace & Organization",
          href: `${basePath}/general/Workspace_&_Organization`,
          icon: IconBuilding,
          description: "Workspace details and org structure",
        },
        {
          title: "Localization & Theme",
          href: `${basePath}/general/Localization_&_Theme`,
          icon: IconPalette,
          description: "Appearance, language, and time format",
        },
      ],
    },
    {
      title: "Models & APIs",
      items: [
        {
          title: "API Keys",
          href: `${basePath}/models/API_Keys`,
          icon: IconKey,
          description: "API access credentials and tokens",
        },
      ],
    },
    {
      title: "Account & Preferences",
      items: [
        {
          title: "Notifications",
          href: `${basePath}/notifications`,
          icon: IconBell,
          description: "Email and activity alert preferences",
        },
        {
          title: "Billing & Plans",
          href: `${basePath}/billing`,
          icon: IconCreditCard,
          description: "Subscription plan, usage, and invoices",
        },
        {
          title: "Security & Privacy",
          href: `${basePath}/security`,
          icon: IconShieldLock,
          description: "2FA, active sessions, and password",
        },
      ],
    },
  ];

  return (
    <nav className="w-full lg:w-64 shrink-0 space-y-6">
      {navSections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (pathname.endsWith("/settings") && item.href.endsWith("/general/profile"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
