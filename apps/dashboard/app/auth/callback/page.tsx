"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useRouteAuthContextHook } from "@/context/routeContext";

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const { main_id } = useRouteAuthContextHook();

  useEffect(() => {
    const error = searchParams.get("error");

    if (error) {
      console.error("Authentication failed:", error);
      // Fallback if there is an error during sign-in
      router.push("/");
      return;
    }

    // Wait until the session finishes loading
    if (!isPending) {
      if (session?.user && main_id && main_id !== "0") {
        // Successfully logged in, redirect to the user's dashboard projects
        router.push(`/projects/${main_id}/projects`);
      } else if (!session?.user) {
        // No session found, redirect to home page
        router.push("/");
      }
    }
  }, [isPending, session, main_id, router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Authenticating...</h2>
        <p className="text-muted-foreground text-zinc-400">
          Please wait while we log you in.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          </div>
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  );
}
