"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Organization, MockUser } from "@/lib/organization-data";
import { orgApi, DBOrganization } from "@/lib/org-api";
import { supabase } from "@repo/db";
import {
  getOrganizerSession,
  switchActiveOrganizationAction,
  OrganizerSessionUser,
} from "@/lib/organizer-auth";

interface OrgContextValue {
  allOrgs: Organization[]; // Organizations belonging to the currently logged in organizer
  publicOrgs: Organization[]; // Global public organizations (for /explore)
  activeOrg: Organization | null;
  currentUser: MockUser;
  organizerUser: OrganizerSessionUser | null;
  isOrganizer: boolean;
  mounted: boolean;
  isLoading: boolean;
  selectOrg: (org: Organization) => void;
  switchUser: (user: MockUser) => void;
  updateOrg: (updated: Organization) => void;
  leaveCurrentOrg: () => void;
  refresh: () => Promise<void>;
}

const defaultUser: MockUser = {
  id: "",
  name: "Guest Organizer",
  email: "",
  avatar: "/pfpImage.png",
  role: "ORGANIZER",
};

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

function mapDbOrgToOrganization(o: DBOrganization): Organization {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    logoUrl: o.logoUrl || undefined,
    tagline: o.tagline || "",
    description: o.description || "",
    website: o.website || "",
    contactEmail: o.contactEmail || "",
    phone: o.phone || "",
    location: o.location || "",
    ownerId: o.ownerId,
    ownerEmail: o.ownerEmail,
    createdAt: o.createdAt,
    rules: o.rules || [],
    status: o.status || "ACTIVE",
    deletionRequestedAt: o.deletionRequestedAt || null,
    deletionReason: o.deletionReason || null,
    deletionRequestedBy: o.deletionRequestedBy || null,
    settings: (o.settings as any) || {
      allowJoinRequests: true,
      autoApproveMembers: false,
    },
    members: Array.isArray((o as any).members) ? (o as any).members : [],
    assignments: Array.isArray((o as any).assignments) ? (o as any).assignments : [],
    announcements: Array.isArray((o as any).announcements) ? (o as any).announcements : [],
    assets: Array.isArray((o as any).assets) ? (o as any).assets : [],
    messages: Array.isArray((o as any).messages) ? (o as any).messages : [],
  };
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [publicOrgs, setPublicOrgs] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [organizerUser, setOrganizerUser] = useState<OrganizerSessionUser | null>(null);
  const [currentUser, setCurrentUser] = useState<MockUser>(defaultUser);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Session from server action
      const session = await getOrganizerSession();

      if (session?.user) {
        // Query latest organizer data directly from Supabase so the real avatar is always retrieved
        const { data: dbOrganizer } = await supabase
          .from("organizer")
          .select("id, name, email, avatar, role, activeOrganizationId")
          .eq("id", session.user.id)
          .maybeSingle();

        const resolvedAvatar = dbOrganizer?.avatar || session.user.avatar || "/pfpImage.png";
        const resolvedName = dbOrganizer?.name || session.user.name;

        const resolvedUser: OrganizerSessionUser = {
          ...session.user,
          name: resolvedName,
          avatar: resolvedAvatar,
        };

        setOrganizerUser(resolvedUser);
        setCurrentUser({
          id: session.user.id,
          name: resolvedName,
          email: session.user.email,
          role: session.user.role || "Executive Owner",
          avatar: resolvedAvatar,
        });

        // 2. Fetch ONLY this organizer's organizations
        const myDbOrgs = await orgApi.getOrganizerOrganizations(
          session.user.id,
          session.user.email
        );
        const mappedMyOrgs = myDbOrgs.map(mapDbOrgToOrganization);
        setAllOrgs(mappedMyOrgs);

        // 3. Determine active org strictly from this organizer's organizations
        if (mappedMyOrgs.length > 0) {
          const activeId = session.user.activeOrganizationId;
          const matched =
            mappedMyOrgs.find((o) => o.id === activeId) ||
            mappedMyOrgs[0];

          setActiveOrg(matched);

          // If activeOrganizationId in cookie differs from matched, synchronize it
          if (activeId !== matched.id) {
            switchActiveOrganizationAction(matched.id).catch(console.warn);
          }
        } else {
          setActiveOrg(null);
        }
      } else {
        setOrganizerUser(null);
        setAllOrgs([]);
        setActiveOrg(null);
      }

      // 4. Fetch global public organizations (for explore directory)
      try {
        const publicDbOrgs = await orgApi.getPublicOrganizations();
        setPublicOrgs((publicDbOrgs || []).map(mapDbOrgToOrganization));
      } catch (e) {
        console.warn("[OrgContext] Could not load public directory:", e);
        setPublicOrgs([]);
      }
    } catch (err) {
      console.error("[OrgContext] Failed to load organizations from database:", err);
      setAllOrgs([]);
      setActiveOrg(null);
      setPublicOrgs([]);
    } finally {
      setIsLoading(false);
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectOrg = async (org: Organization | any) => {
    if (!org) {
      setActiveOrg(null);
      return;
    }

    // Safety guard: only allow selecting organizations that belong to this organizer
    const isMine = allOrgs.some((o) => o.id === org.id);
    if (!isMine && allOrgs.length > 0) {
      console.warn("Attempted to select an organization not owned by current organizer");
      return;
    }

    const safeOrg: Organization = {
      ...org,
      members: Array.isArray(org.members) ? org.members : [],
      assignments: Array.isArray(org.assignments) ? org.assignments : [],
      announcements: Array.isArray(org.announcements) ? org.announcements : [],
      assets: Array.isArray(org.assets) ? org.assets : [],
      messages: Array.isArray(org.messages) ? org.messages : [],
      rules: Array.isArray(org.rules) ? org.rules : [],
    };
    setActiveOrg(safeOrg);

    try {
      await switchActiveOrganizationAction(org.id);
    } catch (err) {
      console.warn("[OrgContext] switchActiveOrganization error:", err);
    }
  };

  const switchUser = (user: MockUser) => {
    setCurrentUser(user);
    const userOrg =
      allOrgs.find((o) => o.ownerEmail.toLowerCase() === user.email.toLowerCase()) ||
      allOrgs[0] ||
      null;
    setActiveOrg(userOrg);
  };

  const updateOrg = (updated: Organization | any) => {
    if (!updated) return;
    const safeOrg: Organization = {
      ...updated,
      members: Array.isArray(updated.members) ? updated.members : [],
      assignments: Array.isArray(updated.assignments) ? updated.assignments : [],
      announcements: Array.isArray(updated.announcements) ? updated.announcements : [],
      assets: Array.isArray(updated.assets) ? updated.assets : [],
      messages: Array.isArray(updated.messages) ? updated.messages : [],
      rules: Array.isArray(updated.rules) ? updated.rules : [],
    };
    setActiveOrg(safeOrg);
    setAllOrgs((prev) => prev.map((o) => (o.id === updated.id ? safeOrg : o)));
  };

  const leaveCurrentOrg = () => {
    setActiveOrg(null);
  };

  return (
    <OrgContext.Provider
      value={{
        allOrgs,
        publicOrgs,
        activeOrg,
        currentUser,
        organizerUser,
        isOrganizer: true,
        mounted,
        isLoading,
        selectOrg,
        switchUser,
        updateOrg,
        leaveCurrentOrg,
        refresh,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

const fallbackOrgContext: OrgContextValue = {
  allOrgs: [],
  publicOrgs: [],
  activeOrg: null,
  currentUser: defaultUser,
  organizerUser: null,
  isOrganizer: true,
  mounted: false,
  isLoading: false,
  selectOrg: () => {},
  switchUser: () => {},
  updateOrg: () => {},
  leaveCurrentOrg: () => {},
  refresh: async () => {},
};

export function useOrg() {
  const context = useContext(OrgContext);
  return context || fallbackOrgContext;
}
