"use server";

import { supabase } from "@repo/db";

export interface UserLLMKeys {
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  claudeApiKey?: string | null;
}

export async function saveUserLLMKeys(userId: string, keys: UserLLMKeys) {
  if (!userId) throw new Error("User ID is required");

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (keys.geminiApiKey !== undefined) {
    updateData.geminiApiKey = keys.geminiApiKey || null;
  }
  if (keys.openaiApiKey !== undefined) {
    updateData.openaiApiKey = keys.openaiApiKey || null;
  }
  if (keys.claudeApiKey !== undefined) {
    updateData.claudeApiKey = keys.claudeApiKey || null;
  }

  const { data, error } = await supabase
    .from("user")
    .update(updateData)
    .eq("id", userId)
    .select("id, geminiApiKey, openaiApiKey, claudeApiKey")
    .maybeSingle();

  if (error) {
    console.error("Error saving LLM keys via supabase:", error);
    throw new Error(error.message || "Failed to save API keys");
  }

  return data;
}

export async function getUserLLMKeys(userId: string): Promise<UserLLMKeys> {
  if (!userId) return {};

  try {
    const { data, error } = await supabase
      .from("user")
      .select("geminiApiKey, openaiApiKey, claudeApiKey")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch user LLM keys from supabase:", error.message);
      return {};
    }

    if (!data) return {};

    return {
      geminiApiKey: data.geminiApiKey ?? undefined,
      openaiApiKey: data.openaiApiKey ?? undefined,
      claudeApiKey: data.claudeApiKey ?? undefined,
    };
  } catch (err) {
    console.warn("Exception fetching user LLM keys:", err);
    return {};
  }
}
