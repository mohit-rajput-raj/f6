import { ThemeProvider } from "@repo/ui/components/themes/theme-provider";
import React from "react";
import { QueryProvider } from "./tanstackQueryProvider";
import AuthRoutesIdProvider from "@/context/routeContext";


type Props = {
  children: React.ReactNode;
};


const FullStackProvider = (props: Props) => {

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthRoutesIdProvider>
        <QueryProvider>

          {props.children}</QueryProvider>
      </AuthRoutesIdProvider>
    </ThemeProvider>
  );
};

export default FullStackProvider;
