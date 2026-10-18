"use client";
import { useRouter, usePathname } from "next/navigation";
import React, { useEffect } from "react";

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const cleanPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

    router.push(`${cleanPath}/dashboard`);
  }, [router, pathname]);

  return <div>Loading...</div>;
}
