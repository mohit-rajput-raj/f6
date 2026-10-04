import crypto from "crypto";

/**
 * Hash a password using PBKDF2 with a secure random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored PBKDF2 hash string (salt:hash).
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false;
  }
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512");
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Generate a short-lived HMAC unlock token for a block editor session.
 */
export function generateUnlockToken(blockId: string, editorWorkflowId: string): string {
  const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET || "desk-block-secret-key-2026";
  const timestamp = Date.now();
  const data = `${blockId}:${editorWorkflowId}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(`${data}:${hmac}`).toString("base64url");
}

/**
 * Verify an unlock token (valid for 1 hour).
 */
export function verifyUnlockToken(token: string, blockId: string, editorWorkflowId: string): boolean {
  if (!token) return false;
  try {
    const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET || "desk-block-secret-key-2026";
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 4) return false;
    const [bId, eId, tsStr, hmac] = parts;
    if (bId !== blockId || eId !== editorWorkflowId) return false;
    const timestamp = parseInt(tsStr, 10);
    // Token valid for 1 hour
    if (isNaN(timestamp) || Date.now() - timestamp > 60 * 60 * 1000) return false;
    const expectedData = `${bId}:${eId}:${tsStr}`;
    const expectedHmac = crypto.createHmac("sha256", secret).update(expectedData).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}
