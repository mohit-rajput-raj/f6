"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { ArrowLeft, ScanText } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { OcrTableExtractor } from "../components/ocr-table-extractor";

export default function OcrExtractPage() {
  const params = useParams();
  const router = useRouter();
  const project = params?.project as string;
  const dashid = params?.dashid as string;
  const { data: session } = useSession();
  const userId = session?.user?.id || "";

  const backUrl = `/${project}/dash/${dashid}/data-library`;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col p-4 md:p-6 lg:p-8 space-y-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Link href={backUrl}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 cursor-pointer shadow-2xs font-medium text-xs h-8"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Library</span>
            </Button>
          </Link>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-2xs">
              <ScanText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground tracking-tight">
                  OCR Table Extractor
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-primary/30 text-primary px-2 py-0"
                >
                  Vision OCR
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Extract table data from images directly into an interactive
                Syncfusion spreadsheet. Edit, format, and delete rows before
                saving to your library.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main OCR Workbench */}
      <div className="flex-1 w-full">
        <OcrTableExtractor
          dashid={dashid}
          userId={userId}
          isInDrawer={false}
          onSaveSuccess={() => {
            router.push(backUrl);
          }}
        />
      </div>
    </div>
  );
}
