import { SidebarDemo } from "@/components/ui/Acertrinity_Sidebar";
import React from "react";

type Props = { children: React.ReactNode };

export default function DashboardLayout({ children }: Props) {
  return <SidebarDemo>{children}</SidebarDemo>;
}
