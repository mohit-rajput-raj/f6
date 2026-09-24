"use server";

import { usersApi, type FetchUsersParams } from "@/lib/api/users";

/**
 * Server action to fetch paginated and filtered users with KPI metrics
 */
export async function fetchUsersAction(params: FetchUsersParams = {}) {
  try {
    return await usersApi.getUsers(params);
  } catch (error: any) {
    console.error("[fetchUsersAction] Error:", error.message || error);
    throw new Error(error.response?.data?.message || "Failed to fetch users from backend server.");
  }
}

/**
 * Server action to fetch full user dossier by ID
 */
export async function fetchUserDetailAction(id: string) {
  try {
    return await usersApi.getUserById(id);
  } catch (error: any) {
    console.error("[fetchUserDetailAction] Error:", error.message || error);
    throw new Error(error.response?.data?.message || "Failed to fetch user dossier.");
  }
}
