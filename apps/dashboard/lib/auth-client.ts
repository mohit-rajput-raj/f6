// apps/web/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  // ... other hooks
} = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_BASE_URL || process.env.AUTH_BASE_URL || "http://localhost:3002/", 
});