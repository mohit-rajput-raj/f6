"use server";

import { subscribersApi, type FetchSubscribersParams } from "@/lib/api/subscribers";

/**
 * Server action to fetch paginated and filtered subscribers with KPI metrics
 */
export async function fetchSubscribersAction(params: FetchSubscribersParams = {}) {
  try {
    return await subscribersApi.getSubscribers(params);
  } catch (error: any) {
    console.error("[fetchSubscribersAction] Error:", error.message || error);
    throw new Error(error.response?.data?.message || "Failed to fetch subscribers from backend server.");
  }
}

/**
 * Server action to fetch full 360-degree subscriber detail by ID
 */
export async function fetchSubscriberDetailAction(id: string) {
  try {
    return await subscribersApi.getSubscriberById(id);
  } catch (error: any) {
    console.error("[fetchSubscriberDetailAction] Error:", error.message || error);
    throw new Error(error.response?.data?.message || "Failed to fetch subscriber detail.");
  }
}
