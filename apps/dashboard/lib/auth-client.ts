// apps/web/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  // ... other hooks
} = createAuthClient({
  baseURL: "http://localhost:3002/",   // relative → works in dev & prod
  // fetchOptions: { credentials: "include" } // usually not needed
});