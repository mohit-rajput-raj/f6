"use client";

import { useRouter } from "next/navigation";
import { ModeToggle } from "@repo/ui/components/themes/toogle";
import { useRouteAuthContextHook } from "@/context/routeContext";
import { useSession, signOut } from "@/lib/auth-client";
// import {} from "@repo/orpc"
type Props = {};
import { client } from "@/lib/orpc";
import React from "react";
const Header = (props: Props) => {
  const router = useRouter();
  const { main_id } = useRouteAuthContextHook();
  const { data: session, isPending: isPending } = useSession();
  // const 
  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16  w-full top-0 left-0 z-20 fixed">
      {session?.user ? (
        <button onClick={() => signOut()}>Sign out</button>
      ) : isPending ? (
        "Loading..."
      ) : (
        <a href="/sign-in">Sign in</a>
      )}

      {!isPending && <a href={`/projects/${main_id}/projects`}>dashboard</a>}
      <ModeToggle />
    </header>
  );
};

export default Header;
