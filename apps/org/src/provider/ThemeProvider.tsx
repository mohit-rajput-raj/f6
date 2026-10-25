"use client";

import React, { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

interface Props {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: Props) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || String(reason || "");
      const stack = reason?.stack || "";

      if (
        message.includes("MetaMask") ||
        message.includes("Failed to connect to MetaMask") ||
        stack.includes("chrome-extension://")
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
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-right" richColors />
    </NextThemesProvider>
  );
}

export default ThemeProvider;
