"use server";

import { supabase, recordAuditLog } from "@repo/db";
import { cookies } from "next/headers";
import crypto from "crypto";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "campus-organizer-secure-session-secret-2026";

export interface OrganizerSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  activeOrganizationId?: string | null;
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

function createSignedSessionToken(payload: OrganizerSessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function verifySignedSessionToken(token: string): OrganizerSessionUser | null {
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
      avatar: parsed.avatar ?? null,
      activeOrganizationId: parsed.activeOrganizationId ?? null,
      metadata: parsed.metadata ?? {},
    };
  } catch {
    return null;
  }
}

// ── Server Actions ──

/**
 * Register a new Organizer with Zod validation
 */
export async function registerOrganizerAction(
  rawInput: Record<string, any>
): Promise<{ ok: boolean; error?: string; user?: OrganizerSessionUser }> {
  try {
    const parseRes = registerSchema.safeParse(rawInput);
    if (!parseRes.success) {
      return { ok: false, error: parseRes.error.issues[0]?.message || "Validation failed" };
    }

    const { name, email, password } = parseRes.data;
    const cleanEmail = email.toLowerCase().trim();

    // Check if organizer already exists
    const { data: existing } = await supabase
      .from("organizer")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return { ok: false, error: "An organizer with this email already exists. Please sign in." };
    }

    const id = crypto.randomUUID();
    const hashedPassword = hashPassword(password);
    const defaultAvatar = rawInput.avatar?.trim() || "/pfpImage.png";

    const { data: organizer, error } = await supabase
      .from("organizer")
      .insert({
        id,
        name,
        email: cleanEmail,
        password: hashedPassword,
        avatar: defaultAvatar,
        role: "ORGANIZER",
        status: "ACTIVE",
        metadata: {
          registeredAt: new Date().toISOString(),
          provider: "credentials",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      })
      .select("id, name, email, role, avatar, activeOrganizationId, metadata")
      .single();

    if (error) {
      console.error("[organizer-auth] Registration error:", error);
      return { ok: false, error: error.message || "Failed to create organizer account." };
    }

    // After registration, organizer must complete organization setup wizard
    const sessionUser: OrganizerSessionUser = {
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      role: organizer.role || "ORGANIZER",
      avatar: organizer.avatar ?? "/pfpImage.png",
      activeOrganizationId: null,
      metadata: organizer.metadata ?? {},
    };

    const token = createSignedSessionToken(sessionUser);
    const cookieStore = await cookies();
    cookieStore.set("organizer_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZER_REGISTERED",
      entity: "Organizer",
      entityId: organizer.id,
      level: "INFO",
      details: {
        organizerId: organizer.id,
        email: cleanEmail,
        name: organizer.name,
      },
    });

    return { ok: true, user: sessionUser };
  } catch (err: any) {
    console.error("[organizer-auth] register exception:", err);
    return { ok: false, error: err?.message || "Internal server error." };
  }
}

/**
 * Login Organizer with email & password and Zod validation
 */
export async function loginOrganizerAction(
  rawInput: Record<string, any>
): Promise<{ ok: boolean; error?: string; user?: OrganizerSessionUser }> {
  try {
    const parseRes = loginSchema.safeParse(rawInput);
    if (!parseRes.success) {
      return { ok: false, error: parseRes.error.issues[0]?.message || "Validation failed" };
    }

    const { email, password } = parseRes.data;
    const cleanEmail = email.toLowerCase().trim();

    const { data: organizer, error } = await supabase
      .from("organizer")
      .select("id, name, email, password, role, avatar, activeOrganizationId, metadata")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error) {
      console.error("[organizer-auth] Query error:", error);
      return { ok: false, error: "Database error during authentication." };
    }

    if (!organizer) {
      return { ok: false, error: "No organizer account found with this email." };
    }


    if (password && organizer.password) {
      const isValid = verifyPassword(password, organizer.password);
      if (!isValid) {
        return { ok: false, error: "Incorrect password." };
      }
    }

    // Update lastLoginAt
    supabase
      .from("organizer")
      .update({ lastLoginAt: new Date().toISOString() })
      .eq("id", organizer.id)
      .then();

    // Check / resolve active organization if not set
    let activeOrganizationId = organizer.activeOrganizationId;
    if (!activeOrganizationId) {
      const { data: orgLink } = await supabase
        .from("organizer_organization")
        .select("organizationId")
        .eq("organizerId", organizer.id)
        .order("isDefault", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orgLink?.organizationId) {
        activeOrganizationId = orgLink.organizationId;
        await supabase
          .from("organizer")
          .update({ activeOrganizationId })
          .eq("id", organizer.id);
      }
    }

    const sessionUser: OrganizerSessionUser = {
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      role: organizer.role || "ORGANIZER",
      avatar: organizer.avatar ?? null,
      activeOrganizationId: activeOrganizationId ?? null,
      metadata: organizer.metadata ?? {},
    };

    const token = createSignedSessionToken(sessionUser);
    const cookieStore = await cookies();
    cookieStore.set("organizer_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZER_LOGIN",
      entity: "Organizer",
      entityId: organizer.id,
      level: "INFO",
      details: {
        organizerId: organizer.id,
        email: cleanEmail,
        name: organizer.name,
        activeOrgId: activeOrganizationId,
      },
    });

    return { ok: true, user: sessionUser };
  } catch (err: any) {
    console.error("[organizer-auth] Login error:", err);
    return { ok: false, error: err?.message || "Internal server error." };
  }
}

/**
 * Get current Organizer session
 */
export async function getOrganizerSession(): Promise<{
  user: OrganizerSessionUser;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("organizer_session")?.value;
    if (!token) return null;

    const user = verifySignedSessionToken(token);
    if (!user) return null;

    return { user };
  } catch {
    return null;
  }
}

/**
 * Switch active organization in session & database
 */
export async function switchActiveOrganizationAction(
  organizationId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await getOrganizerSession();
    if (!session?.user) {
      return { ok: false, error: "Not authenticated" };
    }

    // Update database
    await supabase
      .from("organizer")
      .update({ activeOrganizationId: organizationId })
      .eq("id", session.user.id);

    // Update session cookie
    const updatedUser: OrganizerSessionUser = {
      ...session.user,
      activeOrganizationId: organizationId,
    };

    const token = createSignedSessionToken(updatedUser);
    const cookieStore = await cookies();
    cookieStore.set("organizer_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZER_SWITCHED_ORG",
      entity: "Organization",
      entityId: organizationId,
      level: "INFO",
      details: {
        organizerId: session.user.id,
        newActiveOrgId: organizationId,
      },
    });

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Update Organizer profile settings (name, avatar)
 */
export async function updateOrganizerProfileAction(input: {
  name: string;
  avatar?: string | null;
}): Promise<{ ok: boolean; error?: string; user?: OrganizerSessionUser }> {
  try {
    const session = await getOrganizerSession();
    if (!session?.user) {
      return { ok: false, error: "Not authenticated as organizer" };
    }

    const newName = input.name.trim();
    if (!newName) {
      return { ok: false, error: "Name cannot be empty" };
    }

    const newAvatar = input.avatar !== undefined ? input.avatar : session.user.avatar;

    // 1. Update organizer in Supabase
    const { error } = await supabase
      .from("organizer")
      .update({
        name: newName,
        avatar: newAvatar,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (error) {
      console.error("[organizer-auth] Failed to update organizer profile in database:", error);
      return { ok: false, error: error.message || "Failed to update profile in database" };
    }

    // 2. Also update avatar on organization_member records for this organizer
    if (session.user.email) {
      await supabase
        .from("organization_member")
        .update({
          name: newName,
          avatar: newAvatar,
        })
        .ilike("email", session.user.email);
    }

    // 3. Cookie safety: Cookies are strictly limited to 4096 bytes.
    // Only store URL references in cookie. Never store raw base64 data URLs in cookies.
    const cookieAvatar =
      newAvatar && newAvatar.length < 500 && !newAvatar.startsWith("data:")
        ? newAvatar
        : null;

    const updatedUser: OrganizerSessionUser = {
      ...session.user,
      name: newName,
      avatar: cookieAvatar,
    };

    const token = createSignedSessionToken(updatedUser);
    const cookieStore = await cookies();
    cookieStore.set("organizer_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZER_PROFILE_UPDATED",
      entity: "Organizer",
      entityId: session.user.id,
      level: "INFO",
      details: {
        organizerId: session.user.id,
        name: newName,
        avatarUpdated: input.avatar !== undefined,
      },
    });

    return { ok: true, user: { ...updatedUser, avatar: newAvatar } };
  } catch (err: any) {
    console.error("[organizer-auth] Exception in updateOrganizerProfileAction:", err);
    return { ok: false, error: err?.message || "Internal server error" };
  }
}

/**
 * Terminate Organizer registration and permanently delete the organizer account from database
 */
export async function terminateOrganizerRegistrationAction(
  explicitOrganizerId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await getOrganizerSession();
    const organizerId = explicitOrganizerId || session?.user?.id;

    if (!organizerId) {
      return { ok: false, error: "No active organizer account found to terminate" };
    }

    // Fetch organizer to get their email
    const { data: organizer } = await supabase
      .from("organizer")
      .select("id, email")
      .eq("id", organizerId)
      .maybeSingle();

    const targetEmail = organizer?.email || session?.user?.email;

    // 1. Delete organizer_organization records
    await supabase
      .from("organizer_organization")
      .delete()
      .eq("organizerId", organizerId);

    // 2. Delete any partially provisioned organization owned by this organizer
    await supabase
      .from("organization")
      .delete()
      .eq("ownerId", organizerId);

    // 3. Delete any member records for this organizer email
    if (targetEmail) {
      await supabase
        .from("organization_member")
        .delete()
        .ilike("email", targetEmail.trim().toLowerCase());
    }

    // 4. Permanently delete the organizer record from database
    const { error: deleteErr } = await supabase
      .from("organizer")
      .delete()
      .eq("id", organizerId);

    if (deleteErr) {
      console.error("[organizer-auth] Error deleting organizer record:", deleteErr);
      return { ok: false, error: deleteErr.message || "Failed to delete account" };
    }

    // 5. Delete session cookie
    const cookieStore = await cookies();
    cookieStore.delete("organizer_session");

    // Record audit log
    await recordAuditLog({
      source: "org",
      action: "ORGANIZER_ACCOUNT_TERMINATED",
      entity: "Organizer",
      entityId: organizerId,
      level: "WARN",
      details: {
        organizerId,
        email: targetEmail,
      },
    });

    return { ok: true };
  } catch (err: any) {
    console.error("[organizer-auth] Exception in terminateOrganizerRegistrationAction:", err);
    return { ok: false, error: err?.message || "Internal server error" };
  }
}

/**
 * Logout Organizer
 */
export async function logoutOrganizer(): Promise<{ ok: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("organizer_session");
    return { ok: true };
  } catch {
    return { ok: true };
  }
}


