"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getOrganizerSession,
  logoutOrganizer,
  type OrganizerSessionUser,
} from "./organizer-auth";

export interface SessionData {
  user: OrganizerSessionUser;
}

export function useSession() {
  const [data, setData] = useState<SessionData | null>(null);
  const [isPending, setIsPending] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await getOrganizerSession();
      if (res && res.user) {
        setData({ user: res.user });
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { data, isPending, refetch: fetchSession };
}

export async function signOut(options?: {
  fetchOptions?: { onSuccess?: () => void };
}) {
  try {
    await logoutOrganizer();
    if (options?.fetchOptions?.onSuccess) {
      options.fetchOptions.onSuccess();
    }
  } catch (err) {
    console.error("Sign out error:", err);
  } finally {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export const authClient = {
  useSession,
  signOut,
};
