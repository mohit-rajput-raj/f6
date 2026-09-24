"use client";
import React, { useState } from "react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@repo/ui/components/ui/acertrinity/sidebar";
import {
  IconBell,
  IconBrandTabler,
  IconChartBar,
  IconCreditCard,
  IconFileAnalytics,
  IconLogout,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { ModeToggle } from "@repo/ui/components/themes/toogle";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SidebarDemo({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Users",
      href: "/users",
      icon: (
        <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Subscribers",
      href: "/subscribers",
      icon: (
        <IconCreditCard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: (
        <IconChartBar className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Logs",
      href: "/logs",
      icon: (
        <IconFileAnalytics className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Notifications",
      href: "/notifications",
      icon: (
        <IconBell className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  const [open, setOpen] = useState(false);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Admin";
  const userImage = session?.user?.image;
  const userEmail = session?.user?.email;

  React.useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  const handleLogout = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/login");
          },
        },
      });
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      router.replace("/login");
    }
  };

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-neutral-100 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-neutral-100" />
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Verifying portal session...
          </span>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div
      className={cn(
        "mx-auto flex h-screen w-full flex-1 flex-col overflow-hidden border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-20">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* User Profile */}
            <SidebarLink
              link={{
                label: userName,
                href: "/settings",
                icon: userImage ? (
                  <img
                    src={userImage}
                    className="h-7 w-7 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-600 object-cover"
                    width={50}
                    height={50}
                    alt="Avatar"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-white dark:bg-neutral-200 dark:text-neutral-900">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                ),
              }}
            />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <IconLogout className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
              >
                Logout
              </motion.span>
            </button>

            <ModeToggle />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-1">
        <main className="flex h-full w-full flex-1 flex-col gap-2 overflow-y-auto rounded-tl-2xl border border-neutral-200 bg-white p-2 md:p-10 dark:border-neutral-700 dark:bg-neutral-900">
          {children}
        </main>
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        Campus Admin
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </Link>
  );
};
