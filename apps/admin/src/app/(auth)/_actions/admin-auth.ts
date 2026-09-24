"use server";

import { supabase } from "@repo/db";
import { cookies } from "next/headers";
import crypto from "crypto";

const MASTER_PASSKEY = process.env.ADMIN_PASSKEY || "admin@campus2026";

const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "campus-admin-secure-session-secret-2026";

export interface AdminSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  metadata?: Record<string, any>;
}

// ── Crypto Helpers ──

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(verifyHash, "hex")
    );
  } catch {
    return false;
  }
}

function createSignedSessionToken(payload: AdminSessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function verifySignedSessionToken(token: string): AdminSessionUser | null {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(body)
      .digest("base64url");

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (parsed.exp && parsed.exp < Date.now()) {
      return null; // Expired
    }

    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      image: parsed.image ?? null,
      metadata: parsed.metadata ?? {},
    };
  } catch {
    return null;
  }
}

// ── Passkey Validation ──

export async function validatePasskey(passkey: string): Promise<boolean> {
  if (!passkey) return false;
  const input = passkey.trim();
  const configured = MASTER_PASSKEY.trim();
  return input === configured;
}

// ── Check if any Admin exists ──

export async function checkAdminExists(): Promise<{ exists: boolean }> {
  try {
    const { count, error } = await supabase
      .from("admin")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("[admin-auth] checkAdminExists error:", error);
      // Fallback query without head
      const { data } = await supabase.from("admin").select("id").limit(1);
      return { exists: (data?.length ?? 0) > 0 };
    }

    return { exists: (count ?? 0) > 0 };
  } catch (err) {
    console.error("[admin-auth] checkAdminExists exception:", err);
    return { exists: false };
  }
}

// ── Register Initial Admin ──

export async function registerAdmin(formData: {
  name: string;
  email: string;
  password: string;
  passkey: string;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; error?: string; user?: AdminSessionUser }> {
  try {
    const name = formData.name?.trim();
    const email = formData.email?.toLowerCase().trim();
    const password = formData.password;
    const passkey = formData.passkey;

    // 1. Validate Passkey
    const isPasskeyValid = await validatePasskey(passkey);
    if (!isPasskeyValid) {
      return {
        ok: false,
        error:
          "Invalid master passkey. Check ADMIN_PASSKEY in your environment configuration.",
      };
    }

    // 2. Validate Fields
    if (!name || name.length < 2) {
      return { ok: false, error: "Name must be at least 2 characters long." };
    }
    if (!email || !email.includes("@")) {
      return { ok: false, error: "Please enter a valid email address." };
    }
    if (!password || password.length < 8) {
      return {
        ok: false,
        error: "Password must be at least 8 characters long.",
      };
    }

    // 3. Verify that registration is not already locked
    const { exists } = await checkAdminExists();
    if (exists) {
      return {
        ok: false,
        error:
          "Admin setup is already completed. Registration is permanently locked.",
      };
    }

    // 4. Hash password and insert into admin table
    const id = crypto.randomUUID();
    const hashedPassword = hashPassword(password);
    const initialMetadata = {
      initialSetup: true,
      registeredAt: new Date().toISOString(),
      ...(formData.metadata || {}),
    };

    const { data, error } = await supabase
      .from("admin")
      .insert({
        id,
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        metadata: initialMetadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      })
      .select("id, name, email, role, image, metadata")
      .single();

    if (error) {
      console.error("[admin-auth] registerAdmin insert error:", error);
      return {
        ok: false,
        error: error.message || "Failed to create administrator account in database.",
      };
    }

    const sessionUser: AdminSessionUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role || "ADMIN",
      image: data.image ?? null,
      metadata: data.metadata ?? {},
    };

    // 5. Set session cookie
    const token = createSignedSessionToken(sessionUser);
    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return { ok: true, user: sessionUser };
  } catch (err: any) {
    console.error("[admin-auth] registerAdmin error:", err);
    return { ok: false, error: err?.message || "Internal server error." };
  }
}

// ── Login Admin ──

export async function loginAdmin(formData: {
  email: string;
  password: string;
  passkey: string;
}): Promise<{ ok: boolean; error?: string; user?: AdminSessionUser }> {
  try {
    const email = formData.email?.toLowerCase().trim();
    const password = formData.password;
    const passkey = formData.passkey;

    // 1. Validate Passkey
    const isPasskeyValid = await validatePasskey(passkey);
    if (!isPasskeyValid) {
      return { ok: false, error: "Invalid master passkey." };
    }

    if (!email || !password) {
      return { ok: false, error: "Please enter your email and password." };
    }

    // 2. Fetch admin from database
    const { data: adminUser, error } = await supabase
      .from("admin")
      .select("id, name, email, password, role, image, metadata")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("[admin-auth] loginAdmin query error:", error);
      return { ok: false, error: "Database error during authentication." };
    }

    if (!adminUser) {
      return { ok: false, error: "No administrator found with this email." };
    }

    // 3. Verify Password Hash
    const passwordValid = verifyPassword(password, adminUser.password);
    if (!passwordValid) {
      return { ok: false, error: "Incorrect password." };
    }

    // 4. Update last login timestamp asynchronously
    supabase
      .from("admin")
      .update({ lastLoginAt: new Date().toISOString() })
      .eq("id", adminUser.id)
      .then();

    const sessionUser: AdminSessionUser = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role || "ADMIN",
      image: adminUser.image ?? null,
      metadata: adminUser.metadata ?? {},
    };

    // 5. Set session cookie
    const token = createSignedSessionToken(sessionUser);
    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return { ok: true, user: sessionUser };
  } catch (err: any) {
    console.error("[admin-auth] loginAdmin error:", err);
    return { ok: false, error: err?.message || "Internal server error." };
  }
}

// ── Logout Admin ──

export async function logoutAdmin(): Promise<{ ok: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// ── Get Current Admin Session ──

export async function getAdminSession(): Promise<{ user: AdminSessionUser } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return null;

    const user = verifySignedSessionToken(token);
    if (!user) return null;

    return { user };
  } catch {
    return null;
  }
}
