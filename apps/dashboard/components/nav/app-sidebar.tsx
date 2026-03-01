"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconLamp,
  IconListDetails,
  IconPlugConnected,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav/nav-documents"
import { NavMain } from "@/components/nav/nav-main"
import { NavSecondary } from "@/components/nav/nav-secondary"
// import { CurrUsers, NavUser } from "@/components/nav/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/ui/sidebar"
import { useRouteAuthContextHook } from "@/context/routeContext"
import { toast } from "sonner"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  sampledocuments: [
    {
      name: "Data Library",
      url: "/data-library",
      icon: IconDatabase,
    },
    {
      name: "Data Library",
      url: "/data-library",
      icon: IconDatabase,
    },
    {
      name: "Data Library",
      url: "/data-library",
      icon: IconDatabase,
    },
    {
      name: "Data Library",
      url: "/data-library",
      icon: IconDatabase,
    },
  ],
  ColapseblenavMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
      name: "Data Library1",
      url: "/data-library",
      
      icon: IconDatabase,
    },
     {
      name: "Data Library2",
      url: "/data-library",
      
      icon: IconDatabase,
    },
     {
      name: "Data Library3",
      url: "/data-library",
      
      icon: IconDatabase,
    },
     {
      name: "Data Library4",
      url: "/data-library",
      
      icon: IconDatabase,
    },
   
    
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
      name: "Data Library1",
      url: "/data-library",
      
      icon: IconDatabase,
    },
     {
      name: "Data Library2",
      url: "/data-library",
      
      icon: IconDatabase,
    },
     {
      name: "Data Library3",
      url: "/data-library",
      
      icon: IconDatabase,
    },
     {
      name: "Data Library4",
      url: "/data-library",
      
      icon: IconDatabase,
    },
      
      ],
    },
    
    
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/editor",
      icon: IconDashboard,
    },
    {
      title: "Lifecycle",
      url: "/lifecycle",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: IconChartBar,
    },
    {
      title: "Files",
      url: "/files",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "/team",
      icon: IconUsers,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "/capture",
      items: [
        {
          title: "Active Proposals",
          url: "/capture/active-proposals",
        },
        {
          title: "Archived",
          url: "/capture/archived",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "/proposal",
      items: [
        {
          title: "Active Proposals",
          url: "/proposal/active-proposals",
        },
        {
          title: "Archived",
          url: "/proposal/archived",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "/prompts",
      items: [
        {
          title: "Active Proposals",
          url: "/prompts/active-proposals",
        },
        {
          title: "Archived",
          url: "/prompts/archived",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "/help",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "/search",
      icon: IconSearch,
    },
    // {
    //   title: "Docs",
    //   url: "/3001",
    //   icon: IconFileDescription,
    // },
  ],
  documents: [
    {
      name: "Data Library",
      url: "/data-library",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "/reports",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "/word-assistant",
      icon: IconFileWord,
    },
  ],
  projects: [
    {
      name: "Projects",
      url: "/projects",
      icon: IconDatabase,
    },
    {
      name: "People",
      url: "/people",
      icon: IconReport,
    },
    {
      name: "Billing",
      url: "/billing",
      icon: IconFileWord,
    },
    {
      name:"Integration",
      url:"/integration",
      icon: IconInnerShadowTop,
      
    },
    {
      name:"Settings",
      url:"/settings",
      icon: IconSettings,
      
    },
    {
      name:"Plugins",
      url:"/plugs",
      icon: IconPlugConnected,
      
    },
    
  ],
}
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  val: string;
  
};
import { NavProjects } from "./nav-projects"
import { ColapsebleNavMain } from "./colapseble-nave-main"
import { BookOpen, Bot, Settings2, SquareTerminal } from "lucide-react"
import { signOut } from "@/lib/auth-client"
import { Button } from "@repo/ui/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { useEditorStore } from "@/stores/user.store"
export const  AppSidebar=({ val, ...props }: AppSidebarProps) =>{
  // console.log(val);
  const navigate = useRouter()
  const {dash_id , main_id, setDashid} = useRouteAuthContextHook();
  const dashid = usePathname().split("/")[3]
  if(dashid){
    setDashid(dashid)
  }
  

  
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconLamp className="!size-5" />
                {/* <IconInnerShadowTop className="!size-5" /> */}
                <span className="text-base font-semibold">Machine</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
     {val==="dashboard" && (
       <SidebarContent>
        <NavMain items={data.navMain} dashid={dashid}/>
        <NavDocuments items={data.documents} val={val} dashid={dashid} />
        <ColapsebleNavMain items={data.ColapseblenavMain} />
        <NavSecondary items={data.navSecondary} dashid={dashid} className="mt-auto" />
      </SidebarContent>
     )}
     {val==="projects" && ( <SidebarContent>
        {/* <NavMain items={data.navMain} /> */}
        <NavProjects items={data.projects} main_id={main_id} val={val} />
      </SidebarContent>)}
      <SidebarFooter className="flex gap-3 justify-between ">
        <Button asChild variant={'outline'}><button onClick={() => {
          signOut();
          navigate.push("/auth/sign-in");
        }}>Sign out</button></Button>
        {/* <NavUser user={data.user} /> */}
        {/* <CurrUsers /> */}
      </SidebarFooter>
    </Sidebar>
  )
}
