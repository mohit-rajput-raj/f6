import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import { polarClient } from "@polar-sh/better-auth/client";

export const createAuthClient = () =>
  createBetterAuthClient({
    plugins: [polarClient()],
  });
export type SignIn = ReturnType<typeof createAuthClient>["signIn"];