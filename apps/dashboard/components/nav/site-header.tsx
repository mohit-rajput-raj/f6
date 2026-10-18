import { Separator } from "@repo/ui/components/ui/separator"
import { SidebarTrigger } from "@repo/ui/components/ui/sidebar"
import { ModeToggle } from "@repo/ui/components/themes/toogle"
import { BreadcrumbWithCustomSeparator } from "../breadcrumb/breadcrumb"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-xs transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1.5 px-3 sm:px-4 lg:gap-2 lg:px-6 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-1.5 sm:mx-2 data-[orientation=vertical]:h-4 shrink-0"
        />
        <div className="min-w-0 flex-1 overflow-hidden flex items-center">
          <BreadcrumbWithCustomSeparator />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
