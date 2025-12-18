"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/ui/sidebar"
import { useRouter, usePathname } from "next/navigation"
import { DockIcon } from "lucide-react"
import { useRouteAuthContextHook } from "@/context/routeContext"

export function NavSecondary({
  items,
  ...props
}: {
  dashid?: string
  items: {
    title: string
    url: string
    icon: Icon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  
  const router = useRouter()
  const pathname = usePathname()
  const { dash_id } = useRouteAuthContextHook()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const fullUrl = `/dashboard/dash/${dash_id}${item.url}`
            const isActive = pathname === fullUrl

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  className={`cursor-pointer ${
                    isActive ? "bg-accent text-accent-foreground" : ""
                  }`}
                  asChild
                  onClick={() => router.push(fullUrl)}
                >
                  <a>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}

          {/* Docs Link (opens new tab) */}
          <SidebarMenuItem>
            <SidebarMenuButton className="cursor-pointer" asChild>
              <a
                href="http://localhost:3001/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DockIcon />
                <span>Docs</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
