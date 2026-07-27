"use client";

import { ThemeProvider } from "@repo/ui/components/themes/theme-provider";
import React, { useEffect } from "react";
import { QueryProvider } from "./tanstackQueryProvider";
import AuthRoutesIdProvider from "@/context/routeContext";

type Props = {
  children: React.ReactNode;
};

const FullStackProvider = (props: Props) => {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || String(reason || "");
      const stack = reason?.stack || "";

      if (
        message.includes("MetaMask") ||
        message.includes("Failed to connect to MetaMask") ||
        stack.includes("chrome-extension://") ||
        stack.includes("nkbihfbeogaeaoehlefnkodbefgpgknn")
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthRoutesIdProvider>
        <QueryProvider>{props.children}</QueryProvider>
      </AuthRoutesIdProvider>
    </ThemeProvider>
  );
};

export default FullStackProvider;

