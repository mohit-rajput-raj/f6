// "use client";

// import React from "react";
// import { Skeleton } from "@repo/ui/components/ui/skeleton";

// // ─── Top Bar Skeleton ─────────────────────────────────────────
// function TopBarSkeleton() {
//   return (
//     <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
//       <div className="flex items-center gap-3">
//         {/* Icon */}
//         <Skeleton className="w-9 h-9 rounded-xl" />
//         {/* Title + subtitle */}
//         <div className="space-y-1.5">
//           <Skeleton className="h-4 w-16" />
//           <Skeleton className="h-2.5 w-48" />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Tab Bar Skeleton ─────────────────────────────────────────
// function TabBarSkeleton() {
//   return (
//     <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
//       <div className="flex items-center gap-1">
//         {[72, 56, 64].map((w, i) => (
//           <Skeleton
//             key={i}
//             className="h-7 rounded-md"
//             style={{ width: `${w}px` }}
//           />
//         ))}
//       </div>
//       <Skeleton className="h-7 w-20 rounded-md" />
//     </div>
//   );
// }

// // ─── Input Panel Skeleton (Left side) ─────────────────────────
// function InputPanelSkeleton() {
//   return (
//     <div className="h-full overflow-hidden">
//       {/* Text Inputs Section */}
//       <div className="p-3 border-b">
//         <div className="flex items-center gap-1.5 mb-2">
//           <Skeleton className="h-3.5 w-3.5 rounded" />
//           <Skeleton className="h-3 w-20" />
//           <Skeleton className="h-4 w-5 rounded-full" />
//         </div>
//         <div className="space-y-1.5">
//           {[1, 2].map((i) => (
//             <div
//               key={i}
//               className="rounded-lg border p-2 bg-background space-y-1.5"
//             >
//               <Skeleton className="h-2.5 w-16" />
//               <Skeleton className="h-7 w-full rounded-md" />
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Sheets Section */}
//       <div className="p-3 border-b">
//         <div className="flex items-center gap-1.5 mb-2">
//           <Skeleton className="h-3.5 w-3.5 rounded" />
//           <Skeleton className="h-3 w-14" />
//           <Skeleton className="h-4 w-5 rounded-full" />
//         </div>
//         <div className="space-y-1.5">
//           {[1, 2].map((i) => (
//             <div key={i} className="rounded-lg border p-2 bg-muted space-y-1.5">
//               <Skeleton className="h-3 w-24" />
//               <div className="flex items-center justify-between">
//                 <Skeleton className="h-2.5 w-28" />
//               </div>
//               {/* Column tags */}
//               <div className="flex flex-wrap gap-0.5">
//                 {Array.from({ length: 4 }).map((_, j) => (
//                   <Skeleton
//                     key={j}
//                     className="h-4 rounded border border-border"
//                     style={{ width: `${30 + Math.random() * 30}px` }}
//                   />
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Checkbox Fields Section */}
//       <div className="p-3">
//         <div className="flex items-center gap-1.5 mb-2">
//           <Skeleton className="h-3.5 w-3.5 rounded" />
//           <Skeleton className="h-3 w-16" />
//           <Skeleton className="h-4 w-5 rounded-full" />
//         </div>
//         <div className="space-y-1">
//           {[1, 2].map((i) => (
//             <div
//               key={i}
//               className="flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-background"
//             >
//               <Skeleton className="h-3.5 w-3.5 rounded-sm" />
//               <Skeleton className="h-3 w-20" />
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Spreadsheet Preview Skeleton (Right side) ────────────────
// function SpreadsheetPreviewSkeleton() {
//   const cols = 7;
//   const rows = 10;

//   return (
//     <div className="h-full flex flex-col">
//       {/* Preview tabs header */}
//       <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 bg-muted/30">
//         <Skeleton className="h-3.5 w-3.5 rounded" />
//         <Skeleton className="h-3 w-14" />

//         <div className="flex items-center gap-1.5 ml-2">
//           {/* Output Preview tab */}
//           <Skeleton className="h-6 w-28 rounded-md" />
//           {/* Sheet tabs */}
//           <Skeleton className="h-6 w-20 rounded-md" />
//           <Skeleton className="h-6 w-20 rounded-md" />
//           {/* Errors tab */}
//           <Skeleton className="h-6 w-16 rounded-md" />
//           {/* Pushed Files tab */}
//           <Skeleton className="h-6 w-24 rounded-md" />
//         </div>

//         <Skeleton className="h-4 w-20 rounded-full ml-auto" />
//       </div>

//       {/* Spreadsheet grid skeleton */}
//       <div className="flex-1 min-h-0 overflow-hidden p-0.5">
//         <div className="h-full border border-border rounded-md overflow-hidden bg-background">
//           {/* Column headers */}
//           <div className="flex border-b border-border bg-muted/50">
//             {/* Row number header */}
//             <div className="w-10 h-7 border-r border-border shrink-0 flex items-center justify-center">
//               <Skeleton className="h-2.5 w-4" />
//             </div>
//             {Array.from({ length: cols }).map((_, i) => (
//               <div
//                 key={i}
//                 className="h-7 border-r border-border flex-1 min-w-[80px] flex items-center justify-center"
//               >
//                 <Skeleton className="h-2.5 w-6" />
//               </div>
//             ))}
//           </div>

//           {/* Data rows */}
//           {Array.from({ length: rows }).map((_, rowIdx) => (
//             <div
//               key={rowIdx}
//               className="flex border-b border-border/50 last:border-b-0"
//               style={{
//                 animationDelay: `${rowIdx * 50}ms`,
//               }}
//             >
//               {/* Row number */}
//               <div className="w-10 h-6 border-r border-border shrink-0 flex items-center justify-center bg-muted/30">
//                 <Skeleton className="h-2 w-3" />
//               </div>
//               {Array.from({ length: cols }).map((_, colIdx) => (
//                 <div
//                   key={colIdx}
//                   className="h-6 border-r border-border/30 flex-1 min-w-[80px] flex items-center px-2"
//                 >
//                   <Skeleton
//                     className="h-2.5"
//                     style={{
//                       width: `${35 + Math.sin(rowIdx * 3 + colIdx * 7) * 25 + 20}%`,
//                       animationDelay: `${(rowIdx * cols + colIdx) * 30}ms`,
//                     }}
//                   />
//                 </div>
//               ))}
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Single BigBlock Skeleton ─────────────────────────────────
// function BigBlockSkeleton({ index }: { index: number }) {
//   return (
//     <div
//       className="rounded-xl border border-border bg-card overflow-hidden"
//       style={{ animationDelay: `${index * 120}ms` }}
//     >
//       {/* BigBlock Header */}
//       <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
//         <div className="flex items-center gap-2">
//           {/* Block number badge */}
//           <Skeleton className="w-6 h-6 rounded-full" />
//           <Skeleton className="h-3.5 w-24" />
//         </div>
//         <div className="flex items-center gap-1.5">
//           {/* Execute button group */}
//           <div className="flex items-center rounded-lg border border-border overflow-hidden">
//             <Skeleton className="h-8 w-20" />
//             <div className="w-px h-5 bg-border" />
//             <Skeleton className="h-8 w-20" />
//           </div>
//           {/* Settings button */}
//           <Skeleton className="h-7 w-7 rounded-md" />
//         </div>
//       </div>

//       {/* Tab Bar */}
//       <TabBarSkeleton />

//       {/* Split content panel */}
//       <div className="flex min-h-[280px]">
//         {/* Left Panel - Inputs (35%) */}
//         <div className="w-[35%] border-r border-border">
//           <InputPanelSkeleton />
//         </div>

//         {/* Resize Handle Skeleton */}
//         <div className="w-[3px] bg-border/50 cursor-col-resize flex items-center justify-center shrink-0">
//           <div className="w-1 h-8 rounded-full bg-muted-foreground/20" />
//         </div>

//         {/* Right Panel - Spreadsheet (65%) */}
//         <div className="flex-1 min-w-0">
//           <SpreadsheetPreviewSkeleton />
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Arrow Connector Skeleton ─────────────────────────────────
// function ArrowConnectorSkeleton() {
//   return (
//     <div className="flex justify-center py-1">
//       <div className="flex flex-col items-center">
//         <Skeleton className="h-5 w-5 rounded" />
//         <Skeleton className="h-2 w-14 mt-0.5" />
//       </div>
//     </div>
//   );
// }

// // ─── Master Sheet Panel Skeleton ──────────────────────────────
// function MasterSheetPanelSkeleton() {
//   return (
//     <div className="rounded-xl border border-border bg-card overflow-hidden">
//       {/* Header */}
//       <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
//         <div className="flex items-center gap-2">
//           <Skeleton className="h-4 w-4 rounded" />
//           <Skeleton className="h-3.5 w-28" />
//           <Skeleton className="h-4 w-14 rounded-full" />
//         </div>
//         <div className="flex items-center gap-1.5">
//           <Skeleton className="h-7 w-7 rounded-md" />
//           <Skeleton className="h-7 w-7 rounded-md" />
//           <Skeleton className="h-7 w-7 rounded-md" />
//         </div>
//       </div>

//       {/* Spreadsheet grid - shorter version */}
//       <div className="border-t border-border bg-background">
//         <div className="flex border-b border-border bg-muted/50">
//           <div className="w-10 h-7 border-r border-border shrink-0" />
//           {Array.from({ length: 6 }).map((_, i) => (
//             <div
//               key={i}
//               className="h-7 border-r border-border flex-1 min-w-[90px] flex items-center justify-center"
//             >
//               <Skeleton className="h-2.5 w-8" />
//             </div>
//           ))}
//         </div>
//         {Array.from({ length: 5 }).map((_, rowIdx) => (
//           <div
//             key={rowIdx}
//             className="flex border-b border-border/50 last:border-b-0"
//           >
//             <div className="w-10 h-6 border-r border-border shrink-0 flex items-center justify-center bg-muted/30">
//               <Skeleton className="h-2 w-3" />
//             </div>
//             {Array.from({ length: 6 }).map((_, colIdx) => (
//               <div
//                 key={colIdx}
//                 className="h-6 border-r border-border/30 flex-1 min-w-[90px] flex items-center px-2"
//               >
//                 <Skeleton
//                   className="h-2.5"
//                   style={{
//                     width: `${30 + Math.sin(rowIdx * 5 + colIdx * 3) * 25 + 20}%`,
//                   }}
//                 />
//               </div>
//             ))}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── MAIN EXPORT: Full Desk Page Skeleton ─────────────────────
// export function DeskPageSkeleton() {
//   return (
//     <div className="h-full w-full flex flex-col bg-background animate-in fade-in duration-300">
//       {/* Top Bar */}
//       <TopBarSkeleton />

//       {/* Blocks Pipeline */}
//       <div className="flex-1 min-h-full max-h-full overflow-y-auto p-4 space-y-3">
//         {/* BigBlock 1 */}
//         <BigBlockSkeleton index={0} />

//         {/* Arrow Connector */}
//         <ArrowConnectorSkeleton />

//         {/* BigBlock 2 */}
//         <BigBlockSkeleton index={1} />

//         {/* Master Sheet Panel */}
//         <div className="pt-2">
//           <MasterSheetPanelSkeleton />
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import React from "react";
import { Skeleton } from "@repo/ui/components/ui/skeleton";

function TopBarSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <Skeleton className="w-8 h-8 rounded-lg" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-2.5 w-40" />
      </div>
    </div>
  );
}

function InputPanelSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <Skeleton className="h-4 w-24" />

      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function SpreadsheetPreviewSkeleton() {
  return (
    <div className="h-full p-2">
      <Skeleton className="h-6 w-32 mb-2 rounded-md" />

      <div className="border rounded-md overflow-hidden">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex border-b last:border-0">
            {Array.from({ length: 5 }).map((_, col) => (
              <div
                key={col}
                className="flex-1 h-7 px-2 flex items-center border-r last:border-0"
              >
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BigBlockSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>

        <Skeleton className="h-7 w-20 rounded-md" />
      </div>

      {/* Content */}
      <div className="flex min-h-[260px]">
        <div className="w-[35%] border-r">
          <InputPanelSkeleton />
        </div>

        <div className="flex-1">
          <SpreadsheetPreviewSkeleton />
        </div>
      </div>
    </div>
  );
}

function ArrowConnectorSkeleton() {
  return (
    <div className="flex justify-center py-2">
      <Skeleton className="h-6 w-6 rounded" />
    </div>
  );
}

function MasterSheetPanelSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>

        <Skeleton className="h-7 w-20 rounded-md" />
      </div>

      <SpreadsheetPreviewSkeleton />
    </div>
  );
}

export function DeskPageSkeleton() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      <TopBarSkeleton />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <BigBlockSkeleton />

        <ArrowConnectorSkeleton />

        <BigBlockSkeleton />

        <MasterSheetPanelSkeleton />
      </div>
    </div>
  );
}
