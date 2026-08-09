"use client"

import * as React from "react"
import {
  IconBell,
  IconCamera,
  IconChartBar,
  IconChartTreemap,
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
  IconTerminal,
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

  ],
  ColapseblenavMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [

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
      title: "Desk",
      url: "/desk",
      icon: IconTerminal,
    },
    // {
    //   title: "Execution Flow",
    //   url: "/editor",
    //   icon: IconChartTreemap,
    // },
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
      name: "Sheet Library",
      url: "/sheet-library",
      icon: IconListDetails,
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
      name: "Connections",
      url: "/connections",
      icon: IconPlugConnected,
    },

    {
      name: "Billing",
      url: "/billing",
      icon: IconFileWord,
    },
    {
      name: "Integration",
      url: "/integration",
      icon: IconInnerShadowTop,

    },
    {
      name: "Settings",
      url: "/settings",
      icon: IconSettings,

    },
    {
      name: "Plugins",
      url: "/plugs",
      icon: IconPlugConnected,

    },
    {
      name: "Notifications",
      url: "/notifications",
      icon: IconBell,
    },

  ],
  global: [
    {
      name: "People",
      url: "/peoples",
      icon: IconReport,
    },
    {
      name: "New Updates",
      url: "/new-updates",
      icon: IconReport,
    }
  ]
}
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  val: string;

};
import { NavProjects } from "./nav-projects"
import { ColapsebleNavMain } from "./colapseble-nave-main"
import { Bell, BookOpen, Bot, Settings2, SquareTerminal } from "lucide-react"
import { signOut, useSession } from "@/lib/auth-client"
import { Button } from "@repo/ui/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { useEditorStore } from "@/stores/user.store"
import Image from "next/image";
export const AppSidebar = ({ val, ...props }: AppSidebarProps) => {
  const pathname = usePathname(); // ← Call ONCE at top level
  const navigate = useRouter()
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const userName = session?.user?.name;
  const userImage = session?.user?.image;

  const dashid = React.useMemo(() => {
    const segments = pathname.split("/");
    return segments[2] === "dash" ? segments[3] || "0" : "0";
  }, [pathname]); // ← only recompute when pathname actually changes

  const { setDashid, main_id } = useRouteAuthContextHook(); // assuming you don't need dash_id/main_id here

  React.useEffect(() => {
    if (dashid && dashid !== "0") {
      setDashid(dashid);
    }
    // Optional: log only in dev to debug
    if (process.env.NODE_ENV === "development") {
    }
  }, [dashid, setDashid]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconLamp className="!size-5" />
                {/* <IconInnerShadowTop className="!size-5" /> */}
                <span className="text-base font-semibold">UNIXL</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      {val === "dashboard" && (
        <SidebarContent>
          <NavMain items={data.navMain} dashid={dashid} />
          <NavDocuments items={data.documents} val={val} dashid={dashid} />
          <ColapsebleNavMain items={data.ColapseblenavMain} main_id={dashid} />
          <NavSecondary items={data.navSecondary} dashid={dashid} className="mt-auto" />
        </SidebarContent>
      )}
      {val === "projects" && (<SidebarContent>
        {/* <NavMain items={data.navMain} /> */}
        <NavProjects items={data.projects} global={data.global} main_id={main_id} val={val} />
      </SidebarContent>)}
      <SidebarFooter className="flex flex-col gap-2 p-2 border-t border-sidebar-border">
        {userEmail && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/50 text-sidebar-accent-foreground min-w-0 border border-sidebar-border/50">
            <div className="w-7 h-7 rounded-full bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-xs font-semibold shrink-0">
              {userImage ? <Image width={28} height={28} src={userImage} alt="" className="w-full h-full rounded-full" /> : (userName || userEmail).charAt(0).toUpperCase()

              } 

            </div>
            <div className="flex flex-col min-w-0 flex-1">
              {userName && (
                <span className="text-xs font-semibold truncate text-sidebar-foreground">
                  {userName}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-2 justify-center h-8 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 hover:border-red-800/40 transition-colors"
          onClick={() => {
            signOut();
            navigate.push("/auth/sign-in");
          }}
        >
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
