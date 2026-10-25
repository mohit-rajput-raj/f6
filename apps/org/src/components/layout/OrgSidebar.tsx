"use client";

import React, { useState } from "react";
import {
  Sidebar,
  SidebarBody,
} from "@repo/ui/components/ui/acertrinity/sidebar";
import {
  IconBrandTabler,
  IconBuilding,
  IconFileSpreadsheet,
  IconUsers,
  IconMessage,
  IconPackage,
  IconSpeakerphone,
  IconPlus,
  IconSettings,
  IconChevronDown,
  IconUserCheck,
  IconCheck,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@repo/ui/lib/utils";
import { ModeToggle } from "@repo/ui/components/themes/toogle";
import {
  Organization,
  MockUser,
  MOCK_USERS,
} from "@/lib/organization-data";

export type ActiveNavTab =
  | "dashboard"
  | "explore"
  | "desks"
  | "members"
  | "messages"
  | "assets"
  | "announcements"
  | "register"
  | "settings";

interface OrgSidebarProps {
  currentTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  activeOrg: Organization | null;
  currentUser: MockUser;
  onSwitchUser: (user: MockUser) => void;
  allOrgs: Organization[];
  onSelectOrg: (org: Organization) => void;
}

export function OrgSidebar({
  currentTab,
  onSelectTab,
  activeOrg,
  currentUser,
  onSwitchUser,
  allOrgs,
  onSelectOrg,
}: OrgSidebarProps) {
  const [open, setOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const links = [
    {
      tab: "dashboard" as ActiveNavTab,
      label: "Dashboard",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      badge: activeOrg ? "Live" : undefined,
    },
    {
      tab: "explore" as ActiveNavTab,
      label: "Explore Orgs",
      icon: (
        <IconBuilding className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      count: allOrgs.length,
    },
    {
      tab: "desks" as ActiveNavTab,
      label: "Desk Pipelines",
      icon: (
        <IconFileSpreadsheet className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      count: activeOrg?.assignments?.length || 0,
    },
    {
      tab: "members" as ActiveNavTab,
      label: "Members & Roles",
      icon: (
        <IconUsers className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      count: activeOrg?.members?.length || 0,
    },
    {
      tab: "messages" as ActiveNavTab,
      label: "Discussions",
      icon: (
        <IconMessage className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      count: activeOrg?.messages?.length || 0,
    },
    {
      tab: "assets" as ActiveNavTab,
      label: "Asset Library",
      icon: (
        <IconPackage className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      count: activeOrg?.assets?.length || 0,
    },
    {
      tab: "announcements" as ActiveNavTab,
      label: "Announcements",
      icon: (
        <IconSpeakerphone className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      count: activeOrg?.announcements?.length || 0,
    },
    {
      tab: "register" as ActiveNavTab,
      label: "New Organization",
      icon: (
        <IconPlus className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      tab: "settings" as ActiveNavTab,
      label: "Org Settings",
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/90 backdrop-blur-md">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {/* Logo & Header */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onSelectTab("dashboard")}
              className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white text-left cursor-pointer"
            >
              <div className="h-6 w-7 shrink-0 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-black text-xs shadow-md">
                UX
              </div>
              <motion.div
                animate={{
                  display: open ? "inline-flex" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="flex flex-col whitespace-pre"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-sm text-neutral-900 dark:text-white">
                    UNIXL
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    Org
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Enterprise Workspace
                </span>
              </motion.div>
            </button>

            {/* Active Org Pill / Switcher */}
            {activeOrg && (
              <div className="relative mt-2">
                <button
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                  className={cn(
                    "w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-colors cursor-pointer",
                    "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  )}
                  title={activeOrg.name}
                >
                  {activeOrg.logoUrl ? (
                    <img
                      src={activeOrg.logoUrl}
                      alt={activeOrg.name}
                      className="size-6 rounded-md object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : (
                    <div className="size-6 rounded-md bg-neutral-700 text-white dark:bg-neutral-300 dark:text-neutral-900 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {activeOrg.name.charAt(0)}
                    </div>
                  )}

                  <motion.div
                    animate={{
                      display: open ? "flex" : "none",
                      opacity: open ? 1 : 0,
                    }}
                    className="flex-1 min-w-0 flex-col"
                  >
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate block">
                      {activeOrg.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate block">
                      {(activeOrg?.members?.length ?? (activeOrg as any)?.membersCount ?? 1)} member
                      {(activeOrg?.members?.length ?? (activeOrg as any)?.membersCount ?? 1) === 1 ? "" : "s"}
                    </span>
                  </motion.div>

                  <motion.div
                    animate={{
                      display: open ? "block" : "none",
                      opacity: open ? 1 : 0,
                    }}
                  >
                    <IconChevronDown className="size-3.5 text-neutral-400" />
                  </motion.div>
                </button>

                {/* Org Switcher Dropdown */}
                <AnimatePresence>
                  {showOrgDropdown && open && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-1.5 shadow-xl space-y-1"
                    >
                      <div className="px-2 py-1 text-[10px] font-medium text-neutral-400 uppercase tracking-wider">
                        Switch Organization
                      </div>
                      {allOrgs.map((org) => {
                        const isCurrent = org.id === activeOrg.id;
                        return (
                          <button
                            key={org.id}
                            onClick={() => {
                              onSelectOrg(org);
                              setShowOrgDropdown(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                              isCurrent
                                ? "bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-neutral-100"
                                : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                            )}
                          >
                            <span className="truncate">{org.name}</span>
                            {isCurrent && <IconCheck className="size-3.5 text-neutral-900 dark:text-neutral-100" />}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => {
                          onSelectTab("register");
                          setShowOrgDropdown(false);
                        }}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer pt-1 border-t border-neutral-100 dark:border-neutral-800"
                      >
                        <IconPlus className="size-3.5" />
                        <span>Create New Organization</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="mt-6 flex flex-col gap-1">
            {links.map((link) => {
              const isActive = currentTab === link.tab;
              return (
                <button
                  key={link.tab}
                  onClick={() => onSelectTab(link.tab)}
                  className={cn(
                    "flex items-center justify-start gap-2.5 px-2 py-2 rounded-lg transition-all text-left cursor-pointer group/link",
                    isActive
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-medium shadow-sm"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800/80 hover:text-neutral-900 dark:hover:text-white"
                  )}
                >
                  <div className={cn(
                    "shrink-0",
                    isActive ? "[&_svg]:text-white dark:[&_svg]:text-neutral-950" : ""
                  )}>
                    {link.icon}
                  </div>

                  <motion.div
                    animate={{
                      display: open ? "flex" : "none",
                      opacity: open ? 1 : 0,
                    }}
                    className="flex-1 items-center justify-between whitespace-pre"
                  >
                    <span className="text-sm font-medium">
                      {link.label}
                    </span>

                    {link.badge && (
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.2 rounded-full",
                        isActive
                          ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      )}>
                        {link.badge}
                      </span>
                    )}

                    {typeof link.count === "number" && link.count > 0 && !link.badge && (
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.2 rounded-full",
                        isActive
                          ? "bg-white/20 text-white dark:bg-black/10 dark:text-black"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      )}>
                        {link.count}
                      </span>
                    )}
                  </motion.div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Area with User Profile Switcher & ModeToggle */}
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className={cn(
                "w-full flex items-center justify-start gap-2.5 p-1.5 rounded-lg border text-left cursor-pointer transition-all",
                "border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-800/70 hover:bg-white dark:hover:bg-neutral-800"
              )}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="size-7 rounded-full object-cover shrink-0 border border-neutral-300 dark:border-neutral-700"
              />

              <motion.div
                animate={{
                  display: open ? "flex" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="flex-1 min-w-0 flex-col"
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                    {currentUser.name}
                  </span>
                  <IconUserCheck className="size-3 text-emerald-500 shrink-0" />
                </div>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {currentUser.role}
                </span>
              </motion.div>

              <motion.div
                animate={{
                  display: open ? "block" : "none",
                  opacity: open ? 1 : 0,
                }}
              >
                <IconChevronDown className="size-3.5 text-neutral-400" />
              </motion.div>
            </button>

            {/* Persona Switcher Menu */}
            <AnimatePresence>
              {showUserDropdown && open && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-2 shadow-2xl space-y-1"
                >
                  <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Simulate Persona (Role View)
                  </div>
                  {MOCK_USERS.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSwitchUser(user);
                          setShowUserDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                          isSelected
                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400"
                        )}
                      >
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="size-5 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{user.name}</div>
                          <div className="text-[10px] text-neutral-400 truncate">{user.role}</div>
                        </div>
                        {isSelected && <IconCheck className="size-3.5 text-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ModeToggle */}
          <div className="flex items-center justify-between px-1">
            <motion.span
              animate={{
                display: open ? "inline-block" : "none",
                opacity: open ? 1 : 0,
              }}
              className="text-xs text-neutral-500 dark:text-neutral-400 font-medium"
            >
              Theme
            </motion.span>
            <ModeToggle />
          </div>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}
