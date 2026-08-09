"use server";

import { prisma } from "@repo/db";

export interface UserLLMKeys {
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  claudeApiKey?: string | null;
}

export async function saveUserLLMKeys(userId: string, keys: UserLLMKeys) {
  if (!userId) throw new Error("User ID is required");

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      geminiApiKey: keys.geminiApiKey ?? undefined,
      openaiApiKey: keys.openaiApiKey ?? undefined,
      claudeApiKey: keys.claudeApiKey ?? undefined,
    },
    select: {
      id: true,
      geminiApiKey: true,
      openaiApiKey: true,
      claudeApiKey: true,
    },
  });

  return updatedUser;
}

export async function getUserLLMKeys(userId: string): Promise<UserLLMKeys> {
  if (!userId) return {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      geminiApiKey: true,
      openaiApiKey: true,
      claudeApiKey: true,
    },
  });

  return {
    geminiApiKey: user?.geminiApiKey ?? undefined,
    openaiApiKey: user?.openaiApiKey ?? undefined,
    claudeApiKey: user?.claudeApiKey ?? undefined,
  };
}
