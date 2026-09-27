"use client";

import * as React from "react";
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
  IconPalette,
  IconKey,
  IconCreditCard,
  IconShieldLock,
  IconTerminal2,
  IconKeyboard,
  IconPuzzle,
  IconRefresh,
  IconReceipt,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav/nav-documents";
import { NavMain } from "@/components/nav/nav-main";
import { NavSecondary } from "@/components/nav/nav-secondary";
// import { CurrUsers, NavUser } from "@/components/nav/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { useRouteAuthContextHook } from "@/context/routeContext";
import { toast } from "sonner";

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
    // {
    //   title: "Playground",
    //   url: "#",
    //   icon: SquareTerminal,
    //   isActive: true,
    //   items: [
    //     {
    //       name: "Data Library3",
    //       url: "/data-library",
    //       icon: IconDatabase,
    //     },
    //     {
    //       name: "Data Library4",
    //       url: "/data-library",
    //       icon: IconDatabase,
    //     },
    //   ],
    // },
    // {
    //   title: "Models",
    //   url: "#",
    //   icon: Bot,
    //   items: [
    //     {
    //       name: "Data Library1",
    //       url: "/data-library",
    //       icon: IconDatabase,
    //     },
    //     {
    //       name: "Data Library2",
    //       url: "/data-library",
    //       icon: IconDatabase,
    //     },
    //     {
    //       name: "Data Library3",
    //       url: "/data-library",
    //       icon: IconDatabase,
    //     },
    //     {
    //       name: "Data Library4",
    //       url: "/data-library",
    //       icon: IconDatabase,
    //     },
    //   ],
    // },
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
    // {
    //   title: "Lifecycle",
    //   url: "/lifecycle",
    //   icon: IconListDetails,
    // },
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
      icon: IconReceipt,
    },
    // {
    //   name: "Integration",
    //   url: "/integration",
    //   icon: IconInnerShadowTop,
    // },
    // Settings has been moved to the bottom IDE action bar
    // {
    //   name: "Plugins",
    //   url: "/plugs",
    //   icon: IconPlugConnected,
    // },
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
    },
  ],
};
type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  val: string;
};
import { NavProjects } from "./nav-projects";
import { ColapsebleNavMain } from "./colapseble-nave-main";
import { Bell, BookOpen, Bot, Settings2, SquareTerminal } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@repo/ui/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useEditorStore } from "@/stores/user.store";
import Image from "next/image";
export const AppSidebar = ({ val, ...props }: AppSidebarProps) => {
  const pathname = usePathname(); // ← Call ONCE at top level
  const navigate = useRouter();
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
          <NavSecondary
            items={data.navSecondary}
            dashid={dashid}
            className="mt-auto"
          />
        </SidebarContent>
      )}
      {val === "projects" && (
        <SidebarContent>
          {/* <NavMain items={data.navMain} /> */}
          <NavProjects
            items={data.projects}
            global={data.global}
            main_id={main_id}
            val={val}
          />
        </SidebarContent>
      )}
      <SidebarFooter className="flex flex-col gap-2 p-2 border-t border-sidebar-border">
        {/* IDE-style Settings Popup Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center justify-between px-2.5 py-2 h-9 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <IconSettings className="size-4 text-muted-foreground group-hover:text-foreground group-hover:rotate-45 transition-all duration-200" />
                <span className="font-medium text-xs">Settings</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/60 rounded border border-border/50">
                ⌘,
              </kbd>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-64 p-1.5 shadow-xl border bg-popover/95 backdrop-blur-md rounded-xl text-xs z-50"
          >
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Preferences & Configuration
            </div>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2 px-2.5 rounded-lg font-medium focus:bg-accent focus:text-accent-foreground"
              onClick={() => {
                const targetProj = val || "projects";
                const targetId = main_id || dashid || "0";
                navigate.push(`/${targetProj}/${targetId}/settings`);
              }}
            >
              <IconSettings className="size-4 text-primary" />
              <span className="flex-1 font-semibold">User Settings</span>
              <span className="text-[10px] text-muted-foreground font-mono">⌘,</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg focus:bg-accent focus:text-accent-foreground"
              onClick={() => {
                const targetProj = val || "projects";
                const targetId = main_id || dashid || "0";
                navigate.push(`/${targetProj}/${targetId}/settings/general/Localization_&_Theme`);
              }}
            >
              <IconPalette className="size-4 text-muted-foreground" />
              <span className="flex-1">Localization & Theme</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg focus:bg-accent focus:text-accent-foreground"
              onClick={() => {
                const targetProj = val || "projects";
                const targetId = main_id || dashid || "0";
                navigate.push(`/${targetProj}/${targetId}/settings/models/API_Keys`);
              }}
            >
              <IconKey className="size-4 text-muted-foreground" />
              <span className="flex-1">API Keys & Models</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg focus:bg-accent focus:text-accent-foreground"
              onClick={() => {
                const targetProj = val || "projects";
                const targetId = main_id || dashid || "0";
                navigate.push(`/${targetProj}/${targetId}/settings/billing`);
              }}
            >
              <IconCreditCard className="size-4 text-muted-foreground" />
              <span className="flex-1">Billing & Plans</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg focus:bg-accent focus:text-accent-foreground"
              onClick={() => {
                const targetProj = val || "projects";
                const targetId = main_id || dashid || "0";
                navigate.push(`/${targetProj}/${targetId}/settings/security`);
              }}
            >
              <IconShieldLock className="size-4 text-muted-foreground" />
              <span className="flex-1">Security & Sessions</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              IDE Tools & Shortcuts
            </div>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg text-muted-foreground focus:text-foreground"
              onClick={() => toast.info("Command Palette shortcut: Ctrl+Shift+P")}
            >
              <IconTerminal2 className="size-4" />
              <span className="flex-1">Command Palette...</span>
              <span className="text-[10px] font-mono">⇧⌘P</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg text-muted-foreground focus:text-foreground"
              onClick={() => toast.info("Keyboard Shortcuts dialog opened")}
            >
              <IconKeyboard className="size-4" />
              <span className="flex-1">Keyboard Shortcuts</span>
              <span className="text-[10px] font-mono">⌘K ⌘S</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg text-muted-foreground focus:text-foreground"
              onClick={() => toast.info("Extensions & Plugin marketplace")}
            >
              <IconPuzzle className="size-4" />
              <span className="flex-1">Extensions & Plugins</span>
              <span className="text-[10px] font-mono">⇧⌘X</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              className="cursor-pointer gap-2 py-1.5 px-2.5 rounded-lg text-muted-foreground focus:text-foreground"
              onClick={() => toast.success("UNIXL is up to date (v2.4.0-stable)")}
            >
              <IconRefresh className="size-4" />
              <span className="flex-1">Check for Updates...</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {userEmail && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/50 text-sidebar-accent-foreground min-w-0 border border-sidebar-border/50">
            <div className="w-7 h-7 rounded-full bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-xs font-semibold shrink-0">
              {userImage ? (
                <Image
                  width={28}
                  height={28}
                  src={userImage}
                  alt=""
                  className="w-full h-full rounded-full"
                />
              ) : (
                (userName || userEmail).charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              {userName && (
                <span className="text-xs font-semibold truncate text-sidebar-foreground">
                  {userName}
                </span>
              )}
              <span
                className="text-[11px] text-muted-foreground truncate"
                title={userEmail}
              >
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
  );
};
