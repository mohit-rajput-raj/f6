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
    <Breadcrumb >
      <BreadcrumbList>
        {crumbs.map((crumb, idx) => (
          <BreadcrumbItem key={idx}>
            <BreadcrumbLink asChild>
              <Link href={crumb.href}>{crumb.name}</Link>
            </BreadcrumbLink>
            {idx < crumbs.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
