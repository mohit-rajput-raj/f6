"use server";

import { prisma } from "@repo/db";

export async function getUserProfile(main_id: string) {
  if (!main_id || main_id === "0") return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: main_id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

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
    const updatedUser = await prisma.user.update({
      where: { id: main_id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.image !== undefined && { image: data.image }),
      },
    });

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}
