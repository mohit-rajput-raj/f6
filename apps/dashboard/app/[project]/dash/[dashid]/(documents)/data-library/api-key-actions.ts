"use server";

import { supabase } from "@repo/db";

export interface UserLLMKeys {
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  claudeApiKey?: string | null;
}

export async function saveUserLLMKeys(userId: string, keys: UserLLMKeys) {
  if (!userId) throw new Error("User ID is required");

  const updateData: any = { updatedAt: new Date().toISOString() };
  if (keys.geminiApiKey !== undefined) updateData.geminiApiKey = keys.geminiApiKey;
  if (keys.openaiApiKey !== undefined) updateData.openaiApiKey = keys.openaiApiKey;
  if (keys.claudeApiKey !== undefined) updateData.claudeApiKey = keys.claudeApiKey;

  const { data: updatedUser, error } = await supabase
    .from("user")
    .update(updateData)
    .eq("id", userId)
    .select("id, geminiApiKey, openaiApiKey, claudeApiKey")
    .single();

  if (error) throw error;
  return updatedUser;
}

export async function getUserLLMKeys(userId: string): Promise<UserLLMKeys> {
  if (!userId) return {};

  const { data: user } = await supabase
    .from("user")
    .select("geminiApiKey, openaiApiKey, claudeApiKey")
    .eq("id", userId)
    .maybeSingle();

  return {
    geminiApiKey: user?.geminiApiKey ?? undefined,
    openaiApiKey: user?.openaiApiKey ?? undefined,
    claudeApiKey: user?.claudeApiKey ?? undefined,
  };
}

