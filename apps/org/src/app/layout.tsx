import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@repo/ui/globals.css";
import { ThemeProvider } from "@/provider/ThemeProvider";
import { QueryProvider } from "@/provider/QueryProvider";
import { OrgProvider } from "@/context/OrgContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UNIXL Organizations | Enterprise Workspace",
  description:
    "Enterprise Organization Hub with distributed desks, teams, assets, and pipeline synchronization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <OrgProvider>{children}</OrgProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
