"use server";

import { supabase } from "@repo/db";
import crypto from "crypto";

/**
 * Sends a 6-digit OTP code to the user's email and saves it to the verification table
 */
export async function sendVerificationOtpAction(email: string) {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please provide a valid email address" };
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Verify user exists
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("id, name, email, emailVerified")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error("[sendVerificationOtpAction] DB error looking up user:", userError);
      return { success: false, error: "Database error looking up account" };
    }

    if (!user) {
      return { success: false, error: "No account found with this email address" };
    }

    if (user.emailVerified) {
      return { success: true, alreadyVerified: true, message: "This email is already verified" };
    }

    // 2. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // 3. Remove old verification codes for this identifier
    await supabase
      .from("verification")
      .delete()
      .eq("identifier", normalizedEmail);

    // 4. Insert new verification record into Better Auth's verification table
    const id = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from("verification")
      .insert({
        id,
        identifier: normalizedEmail,
        value: otpCode,
        expiresAt,
        createdAt: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[sendVerificationOtpAction] Insert error:", insertError);
      return { success: false, error: "Failed to generate verification code" };
    }

    // 5. Send real email via Resend if configured
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSentToInbox = false;
    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
            to: normalizedEmail,
            subject: "Your Verification Code",
            html: `
              <div style="font-family: sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2>Email Verification</h2>
                <p>Use the following 6-digit code to verify your account:</p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #f3f4f6; text-align: center; border-radius: 6px;">
                  ${otpCode}
                </div>
              </div>
            `,
          }),
        });
        if (res.ok) {
          emailSentToInbox = true;
          console.log(`[Email Service] Verification OTP sent via Resend to ${normalizedEmail}`);
        }
      } catch (e) {
        console.error("[Email Service] Resend error:", e);
      }
    }

    console.log(`\n======================================================`);
    console.log(`[Email Verification] Code for ${normalizedEmail}: ${otpCode}`);
    if (!emailSentToInbox) {
      console.log(`[Email Verification] Real email NOT sent to Gmail because RESEND_API_KEY is not set in .env.`);
      console.log(`[Email Verification] Use OTP code: ${otpCode} directly on the screen.`);
    }
    console.log(`======================================================\n`);

    return {
      success: true,
      emailSentToInbox,
      message: emailSentToInbox
        ? `Verification code delivered to ${normalizedEmail}`
        : `Verification code generated for ${normalizedEmail}`,
      devCode: otpCode,
    };
  } catch (err: any) {
    console.error("[sendVerificationOtpAction] Exception:", err);
    return { success: false, error: err.message || "Failed to send verification code" };
  }
}

/**
 * Verifies the user's account using the provided 6-digit OTP code or Better-Auth token
 */
export async function verifyEmailOtpAction(email: string, code: string) {
  if (!email || !code) {
    return { success: false, error: "Email and verification code are required" };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.trim();

  try {
    // 1. Look up user
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("id, email, emailVerified")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError || !user) {
      return { success: false, error: "Account not found for this email address" };
    }

    if (user.emailVerified) {
      return { success: true, message: "Email is already verified!", alreadyVerified: true };
    }

    // 2. Fetch active verification records
    const { data: verifications, error: vError } = await supabase
      .from("verification")
      .select("*")
      .eq("identifier", normalizedEmail);

    if (vError) {
      console.error("[verifyEmailOtpAction] Verification query error:", vError);
    }

    const matched = verifications?.find(
      (v) => (v.value === cleanCode || v.id === cleanCode) && new Date(v.expiresAt) > new Date()
    );

    // Accept matched token, or standard dev bypass code "123456"
    const isValid = Boolean(matched) || cleanCode === "123456";

    if (!isValid) {
      return { success: false, error: "Invalid or expired verification code. Please request a new one." };
    }

    // 3. Delete used verification token
    if (matched?.id) {
      await supabase.from("verification").delete().eq("id", matched.id);
    }

    // 4. Mark user as verified
    const { error: updateError } = await supabase
      .from("user")
      .update({
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[verifyEmailOtpAction] Update error:", updateError);
      return { success: false, error: updateError.message || "Failed to update verification status" };
    }

    return {
      success: true,
      message: "Email verified successfully! You can now log into your account.",
    };
  } catch (err: any) {
    console.error("[verifyEmailOtpAction] Exception:", err);
    return { success: false, error: err.message || "Verification failed" };
  }
}

/**
 * Returns latest verification code for local dev assistance
 */
export async function getLatestDevOtpAction(email: string) {
  if (!email) return { success: false, code: null };
  try {
    const { data } = await supabase
      .from("verification")
      .select("value, expiresAt")
      .eq("identifier", email.toLowerCase().trim())
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && new Date(data.expiresAt) > new Date()) {
      return { success: true, code: data.value };
    }
    return { success: false, code: null };
  } catch {
    return { success: false, code: null };
  }
}

/**
 * Instant dev bypass verification for local testing
 */
export async function directVerifyEmailByAddress(email: string) {
  if (!email) return { success: false, error: "Email is required" };
  try {
    const { data, error } = await supabase
      .from("user")
      .update({
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      })
      .eq("email", email.toLowerCase().trim())
      .select("id, email, emailVerified")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
