"use client"

import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"

import { Button } from "@repo/ui/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useRouteAuthContextHook } from "@/context/routeContext"

export function NavMain({
  items,
  dashid
}: {
  dashid:string,
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
const {main_id} = useRouteAuthContextHook();
  const router = useRouter();
   const pathname = usePathname()
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
            onClick={()=>router.push(`/projects/${main_id}/projects`)}
              tooltip="Quick Create"
              className=" cursor-pointer dark:bg-zinc-300 text-primary-foreground hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
            <Button
              onClick={()=>router.push("/inbox")}
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0 cursor-pointer"
              variant="outline"
            >
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const fullUrl = `/dashboard/dash/${dashid}` + item.url
            const isActive = pathname === fullUrl
            return (
               <SidebarMenuItem key={item.title}>
              <SidebarMenuButton className={`cursor-pointer ${isActive ? "bg-accent text-accent-foreground" : ""}`} tooltip={item.title} onClick={() => router.push(fullUrl)}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
