"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { type Icon } from "@tabler/icons-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/ui/sidebar";

export function NavDocuments({
  items,
  dashid,
}: {
  dashid?: string;
  main_id?: string;
  val?: string;
  items: {
    name: string;
    url: string;
    icon: Icon;
  }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Documents</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const fullUrl = `/dashboard/dash/${dashid}` + item.url;
          const isActive =
            pathname === fullUrl || (item.url && pathname.startsWith(fullUrl + "/"));

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                tooltip={item.name}
                className={`cursor-pointer transition-colors duration-150 ${
                  isActive ? "bg-accent text-accent-foreground font-medium" : ""
                }`}
                onClick={() => router.push(fullUrl)}
              >
                {item.icon && <item.icon className="size-4 shrink-0" />}
                <span className="truncate">{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
