'use client';
import Link from "next/link";
import React, { useState, useEffect } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/components";
import { usePathname } from "next/navigation";
import { getWorkFlow } from "@/app/[project]/dash/[dashid]/editor/_actions/editor.service";

export function BreadcrumbWithCustomSeparator() {
  const pathname = usePathname(); 
  const pathArray = pathname.split("/").filter(Boolean);
  const [workflowName, setWorkflowName] = useState<string | null>(null);

  useEffect(() => {
    const uuidSegment = pathArray.find(segment => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    );
    if (uuidSegment) {
      getWorkFlow(uuidSegment)
        .then((wf) => {
          if (wf?.name) {
            setWorkflowName(wf.name);
          }
        })
        .catch((err) => {
          console.error("Failed to load workflow name for breadcrumb:", err);
        });
    } else {
      setWorkflowName(null);
    }
  }, [pathname]);

  const crumbs = pathArray.map((segment, index) => {
    const href = "/" + pathArray.slice(0, index + 1).join("/");
    let name = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    
    // If segment is a valid UUID, replace it with the resolved workflow/project name
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) && workflowName) {
      name = workflowName;
    }
    return { name, href };
  });

  return (
    <Breadcrumb className="w-full min-w-0">
      <BreadcrumbList
        className="flex items-center flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar gap-1 sm:gap-1.5 text-[10px] sm:text-xs py-0.5 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;

          // If path is long (> 3 crumbs), collapse intermediate items on mobile (< sm)
          if (crumbs.length > 3 && idx > 0 && idx < crumbs.length - 2) {
            return (
              <React.Fragment key={idx}>
                {idx === 1 && (
                  <>
                    <span className="inline-flex sm:hidden items-center text-muted-foreground/60 text-[10px] px-0.5 select-none">
                      …
                    </span>
                    <BreadcrumbSeparator className="inline-flex sm:hidden shrink-0 text-muted-foreground/40 [&>svg]:size-2.5 mx-0.5" />
                  </>
                )}
                <BreadcrumbItem className="shrink-0 hidden sm:inline-flex items-center">
                  <BreadcrumbLink asChild>
                    <Link
                      href={crumb.href}
                      className="text-xs truncate max-w-[150px] transition-colors text-muted-foreground hover:text-foreground"
                      title={crumb.name}
                    >
                      {crumb.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="shrink-0 text-muted-foreground/40 [&>svg]:size-2.5 mx-0.5 hidden sm:inline-flex" />
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={idx}>
              <BreadcrumbItem className="shrink-0 inline-flex items-center">
                <BreadcrumbLink asChild>
                  <Link
                    href={crumb.href}
                    className={`text-[10px] sm:text-xs truncate max-w-[85px] sm:max-w-[150px] transition-colors hover:text-foreground ${
                      isLast
                        ? "font-semibold text-foreground pointer-events-none"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={crumb.name}
                  >
                    {crumb.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className="shrink-0 text-muted-foreground/40 [&>svg]:size-2.5 mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
