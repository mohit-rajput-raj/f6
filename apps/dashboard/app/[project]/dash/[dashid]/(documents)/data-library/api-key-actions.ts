"use server";

import { Pool } from "pg";

// Use a direct PostgreSQL connection (same as BetterAuth uses)
// This bypasses Supabase RLS which blocks writes with the anon key
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface UserLLMKeys {
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  claudeApiKey?: string | null;
}

export async function saveUserLLMKeys(userId: string, keys: UserLLMKeys) {
  if (!userId) throw new Error("User ID is required");

  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (keys.geminiApiKey !== undefined) {
    setClauses.push(`"geminiApiKey" = $${paramIndex++}`);
    values.push(keys.geminiApiKey || null);
  }
  if (keys.openaiApiKey !== undefined) {
    setClauses.push(`"openaiApiKey" = $${paramIndex++}`);
    values.push(keys.openaiApiKey || null);
  }
  if (keys.claudeApiKey !== undefined) {
    setClauses.push(`"claudeApiKey" = $${paramIndex++}`);
    values.push(keys.claudeApiKey || null);
  }

  if (setClauses.length === 0) {
    throw new Error("No keys provided to update");
  }

  // Always update the updatedAt timestamp
  setClauses.push(`"updatedAt" = NOW()`);

  values.push(userId);

  const query = `
    UPDATE "user"
    SET ${setClauses.join(", ")}
    WHERE "id" = $${paramIndex}
    RETURNING "id", "geminiApiKey", "openaiApiKey", "claudeApiKey"
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    throw new Error("User not found or update failed");
  }

  return result.rows[0];
}

export async function getUserLLMKeys(userId: string): Promise<UserLLMKeys> {
  if (!userId) return {};

  const query = `
    SELECT "geminiApiKey", "openaiApiKey", "claudeApiKey"
    FROM "user"
    WHERE "id" = $1
  `;

  const result = await pool.query(query, [userId]);

  if (result.rows.length === 0) {
    return {};
  }

  const user = result.rows[0];
  return {
    geminiApiKey: user.geminiApiKey ?? undefined,
    openaiApiKey: user.openaiApiKey ?? undefined,
    claudeApiKey: user.claudeApiKey ?? undefined,
  };
}
