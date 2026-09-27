"use server";

import { supabase } from "@repo/db";

/**
 * Admin action: Set a user's emailVerified to false.
 * This forces the user to re-verify their email on next login/visit.
 */
export async function unverifyUserEmail(userId: string) {
  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  try {
    const { data, error } = await supabase
      .from("user")
      .update({
        emailVerified: false,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, emailVerified")
      .single();

    if (error) {
      console.error("[unverifyUserEmail] DB Error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data,
    };
  } catch (err: any) {
    console.error("[unverifyUserEmail] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to unverify user email",
    };
  }
}

/**
 * Admin action: Re-verify a user's email (set emailVerified back to true).
 */
export async function reverifyUserEmail(userId: string) {
  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  try {
    const { data, error } = await supabase
      .from("user")
      .update({
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, email, emailVerified")
      .single();

    if (error) {
      console.error("[reverifyUserEmail] DB Error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data,
    };
  } catch (err: any) {
    console.error("[reverifyUserEmail] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to re-verify user email",
    };
  }
}

/**
 * Admin action: Revoke all sessions for a user (force logout).
 */
export async function revokeAllUserSessions(userId: string) {
  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  try {
    const { error } = await supabase
      .from("session")
      .delete()
      .eq("userId", userId);

    if (error) {
      console.error("[revokeAllUserSessions] DB Error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
    };
  } catch (err: any) {
    console.error("[revokeAllUserSessions] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to revoke sessions",
    };
  }
}

