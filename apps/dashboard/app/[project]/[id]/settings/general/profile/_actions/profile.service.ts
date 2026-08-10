"use server";

import { supabase } from "@repo/db";

export async function getUserProfile(main_id: string) {
  if (!main_id || main_id === "0") return null;

  try {
    const { data: user } = await supabase
      .from("user")
      .select("id, name, email, image")
      .eq("id", main_id)
      .maybeSingle();

    return user;
  } catch (error) {
    console.error("Error fetching user profile by main_id:", error);
    return null;
  }
}

export async function updateUserProfile(
  main_id: string,
  data: { name?: string; image?: string | null }
) {
  if (!main_id || main_id === "0") {
    throw new Error("Invalid user ID");
  }

  try {
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.image !== undefined) updateData.image = data.image;

    const { data: updatedUser, error } = await supabase
      .from("user")
      .update(updateData)
      .eq("id", main_id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

