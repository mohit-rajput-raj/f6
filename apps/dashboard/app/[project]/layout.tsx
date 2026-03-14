
import { AppSidebar } from '@/components/nav/app-sidebar'
import { SiteHeader } from '@/components/nav/site-header'
import { SidebarInset, SidebarProvider } from '@repo/ui/components/ui/sidebar'
import React from 'react'
import { auth } from "@repo/auth";
import { redirect } from "next/navigation";
import { headers } from 'next/headers';
interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ project: string }>
}

 const  layout=async({ children, params }: LayoutProps)=> {
  const session = await auth.api.getSession({
    headers: await headers(),  
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  const { project   } =await params;
  console.log(project);
  


  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 62)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
        <AppSidebar  val={project} />
  <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col max-h-screen ">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
      
    </SidebarProvider>
  );
}
export default layout






