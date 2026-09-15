"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export const QueryProvider = ({ children }: { children: React.ReactNode }) =>{
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 minutes — don't refetch fresh data
        gcTime: 10 * 60 * 1000,         // 10 minutes — keep cache alive
        refetchOnWindowFocus: false,     // don't refetch when user tabs back
        retry: 1,                        // only retry once on failure
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
    {children}
    </QueryClientProvider>
  );
}