"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Download,
  Upload,
  GraduationCap,
  Calendar,
  Package,
  Table as TableIcon,
  FileSpreadsheet,
  FolderPlus,
  Check,
  X,
} from "lucide-react";

const SpreadsheetComponent = dynamic(
  () => import("@syncfusion/ej2-react-spreadsheet").then((m) => m.SpreadsheetComponent),
  { ssr: false }
);

function colLetter(idx: number): string {
  let result = "";
  let n = idx;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

import { Button } from "@repo/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/ui/form";
import { Input } from "@repo/ui/components/ui/input";

import { useRouteAuthContextHook } from "@/context/routeContext";
import { useSession } from "@/lib/auth-client";
import { useAllWorkFlow } from "@/app/[project]/dash/[dashid]/editor/_actions/editor.queryes";
import { createWorkFlow, deleteWorkFlow, deleteMultipleWorkflows } from "@/app/[project]/dash/[dashid]/editor/_actions/editor.service";
import { useEditorStore } from "@/stores/user.store";
import {
  CreateWorkFlowFormProps,
  CreateWorkFlowFormSchema,
} from "@/zodschema/workflows";
import { UserAvatarStack } from "./membersListPictures";

export const ProjectList = () => {
  const router = useRouter();
  const { setDashid } = useRouteAuthContextHook();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const { dashid, setDashidValue } = useEditorStore();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: allWorkflows = [], isLoading, refetch, isRefetching } = useAllWorkFlow(userId!);

  const deletemutation = useMutation({
    mutationFn: async ({ id, flowId }: { id: string; flowId: string }) => {
      return await deleteWorkFlow({ id, flowId });
    },
    onSuccess: () => {
      setDeletingId(null);
      refetch();
    },
    onError: () => {
      setDeletingId(null);
      alert("Failed to delete workflow.");
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async ({ id, flowIds }: { id: string; flowIds: string[] }) => {
      return await deleteMultipleWorkflows({ id, flowIds });
    },
    onSuccess: () => {
      setSelectedIds([]);
      setSelectMode(false);
      refetch();
    },
    onError: () => {
      alert("Failed to delete selected workflows.");
    },
  });

  useEffect(() => {
    if (!isPending && !userId) {
      router.push("/");
    }
  }, [isPending, userId, router]);

  if (isPending || isLoading || isRefetching) {
    return <p className="p-10 text-center">Loading workflows...</p>;
  }

  const filtered = allWorkflows
    .filter((wf: any) => wf.name.toLowerCase().includes(search.toLowerCase()));

  const handleRoute = (id: string) => {
    if (selectMode) return; // Don't navigate while in select mode
    if (!id) return;
    setDashidValue(id);
    window.open(`/dashboard/dash/${id}/desk`, "_blank");
  };

  const onDelete = (flowId: string) => {
    if (!userId) return;
    setDeletingId(flowId);
    deletemutation.mutate({ id: userId, flowId });
  };

  const onBatchDelete = () => {
    if (!userId || selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected project(s)?`)) return;
    batchDeleteMutation.mutate({ id: userId, flowIds: selectedIds });
  };

  // Enter select mode from a row's dropdown, pre-selecting that row
  const enterSelectMode = (initialId: string) => {
    setSelectMode(true);
    setSelectedIds([initialId]);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const isAllSelected = filtered.length > 0 && filtered.every((wf: any) => selectedIds.includes(wf.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all → exit select mode (like WhatsApp)
      setSelectedIds([]);
      setSelectMode(false);
    } else {
      setSelectedIds(filtered.map((wf: any) => wf.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    const alreadySelected = selectedIds.includes(id);
    const next = alreadySelected
      ? selectedIds.filter((sId) => sId !== id)
      : [...selectedIds, id];

    setSelectedIds(next);

    // Auto-exit select mode when last checkbox is unchecked
    if (next.length === 0) {
      setSelectMode(false);
    }
  };

  return (
    <div className="space-y-4 p-10">
      <div className="flex justify-between gap-10 items-center">
        <div className="flex items-center gap-3">
          <CreateWorkFlow />
          {selectMode && selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={onBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
            >
              <Trash2 className="size-4" />
              {batchDeleteMutation.isPending
                ? "Deleting..."
                : `Delete Selected (${selectedIds.length})`}
            </Button>
          )}
          {selectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={exitSelectMode}
              className="text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Cancel Selection
            </Button>
          )}
        </div>
        <Input
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              {selectMode && (
                <TableHead className="w-[45px] text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-zinc-700 bg-zinc-900 cursor-pointer accent-indigo-600"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((workflow: any) => {
                const isSelected = selectedIds.includes(workflow.id);
                return (
                  <TableRow
                    key={workflow.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-950/30 dark:bg-indigo-950/40" : "hover:bg-muted/50"
                    }`}
                    onClick={() =>
                      selectMode ? toggleSelectOne(workflow.id) : handleRoute(workflow.id)
                    }
                  >
                    {selectMode && (
                      <TableCell
                        className="w-[45px] text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(workflow.id)}
                          className="size-4 rounded border-zinc-700 bg-zinc-900 cursor-pointer accent-indigo-600"
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-semibold">{workflow.name}</TableCell>
                    <TableCell>
                      <UserAvatarStack users={workflow.users} remainingCount={workflow.remainingCount} />
                    </TableCell>
                    <TableCell>{new Date(workflow.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(workflow.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRoute(workflow.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => enterSelectMode(workflow.id)}
                          >
                            Select
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            disabled={deletingId === workflow.id}
                            onClick={() => onDelete(workflow.id)}
                          >
                            {deletingId === workflow.id ? "Deleting..." : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={selectMode ? 6 : 5} className="text-center py-10 text-muted-foreground">
                  No workflows found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
const TEMPLATE_OPTIONS = [
  {
    id: "academic",
    name: "Academic Grade Sheet",
    description: "For marks, subjects, and student GPA tracking.",
    icon: GraduationCap,
    columns: ["Roll_No", "Student_Name", "Subject", "Marks_Obtained", "Max_Marks", "Grade"],
    sampleRows: [
      ["101", "Alice Smith", "Mathematics", "92", "100", "A+"],
      ["102", "Bob Johnson", "Mathematics", "78", "100", "B"],
      ["103", "Charlie Brown", "Physics", "85", "100", "A"],
    ],
  },
  {
    id: "attendance",
    name: "Attendance Tracker",
    description: "Daily attendance with presence summary.",
    icon: Calendar,
    columns: ["Roll_No", "Student_Name", "Date", "Status", "Total_Present", "Total_Absent"],
    sampleRows: [
      ["101", "Alice Smith", "2026-08-10", "Present", "18", "2"],
      ["102", "Bob Johnson", "2026-08-10", "Absent", "15", "5"],
    ],
  },
  {
    id: "inventory",
    name: "Inventory Manager",
    description: "Track items, stock, unit prices, and total value.",
    icon: Package,
    columns: ["Item_Code", "Item_Name", "Category", "Quantity", "Unit_Price", "Total_Value"],
    sampleRows: [
      ["INV-001", "Laptop Pro 15", "Electronics", "25", "1200", "30000"],
      ["INV-002", "Wireless Mouse", "Accessories", "150", "25", "3750"],
    ],
  },
  {
    id: "default",
    name: "Default Sheet",
    description: "Standard multi-purpose sheet structure.",
    icon: TableIcon,
    columns: ["ID", "Name", "Category", "Status", "Date"],
    sampleRows: [
      ["1", "Sample Record 1", "General", "Active", "2026-08-10"],
      ["2", "Sample Record 2", "General", "Pending", "2026-08-10"],
    ],
  },
  {
    id: "custom",
    name: "Custom Sheet",
    description: "Customize columns and data directly on live sheet.",
    icon: FileSpreadsheet,
    columns: [],
    sampleRows: [[]],
  },
];

export const CreateWorkFlow = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState("academic");
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [customRows, setCustomRows] = useState<string[][]>([[]]);
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const spreadsheetRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { refetch } = useAllWorkFlow(userId!);

  const methods = useForm<CreateWorkFlowFormProps>({
    resolver: zodResolver(CreateWorkFlowFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const selectedTpl = TEMPLATE_OPTIONS.find((t) => t.id === selectedTemplateId) || TEMPLATE_OPTIONS[0];

  // Auto-populate Syncfusion Spreadsheet preview
  useEffect(() => {
    if (!open || !spreadsheetRef.current || !selectedTpl) return;
    const timer = setTimeout(() => {
      const ss = spreadsheetRef.current;
      if (!ss || !ss.updateCell) return;
      try {
        const cols = selectedTemplateId === "custom" ? customColumns : selectedTpl.columns;
        const rows = selectedTemplateId === "custom" ? customRows : selectedTpl.sampleRows;

        cols.forEach((col, colIdx) => {
          const cellAddr = `${colLetter(colIdx)}1`;
          ss.updateCell(
            { value: col, style: { fontWeight: "bold", backgroundColor: "#e2e8f0" } },
            cellAddr
          );
        });
        rows.forEach((row, rowIdx) => {
          row.forEach((cell: any, colIdx: number) => {
            const cellAddr = `${colLetter(colIdx)}${rowIdx + 2}`;
            ss.updateCell({ value: String(cell ?? "") }, cellAddr);
          });
        });
      } catch (err) {
        console.warn("Syncfusion preview update warning:", err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [open, selectedTemplateId, selectedTpl, customColumns, customRows]);

  const mutation = useMutation({
    mutationFn: async ({
      id,
      name,
      templateData,
    }: {
      id: string;
      name: string;
      templateData?: { columns: string[]; data?: any[][] };
    }) => {
      return await createWorkFlow({ id, name, templateData });
    },
    onSuccess: (newWorkflow) => {
      refetch();
      setOpen(false);
      window.open(`/dashboard/dash/${newWorkflow.id}/desk`, "_blank");
      methods.reset();
    },
  });

  const handleCreateSubmit = (data: CreateWorkFlowFormProps) => {
    if (!userId) return;

    let columns: string[] = [];
    let sampleData: any[][] = [];

    if (selectedTemplateId === "custom") {
      const ss = spreadsheetRef.current;
      if (ss && ss.getActiveSheet) {
        try {
          const sheet = ss.getActiveSheet();
          const sheetRows = sheet?.rows || [];
          if (sheetRows[0]?.cells) {
            columns = sheetRows[0].cells
              .map((c: any) => c?.value ?? "")
              .filter((v: string) => String(v).trim() !== "");
          }
          for (let r = 1; r < sheetRows.length; r++) {
            const row = sheetRows[r];
            if (!row?.cells) continue;
            const rowData = row.cells
              .slice(0, columns.length)
              .map((c: any) => c?.value ?? "");
            if (rowData.some((v: string) => String(v).trim() !== "")) {
              sampleData.push(rowData);
            }
          }
        } catch (err) {
          console.warn("Custom spreadsheet submit extraction warning:", err);
        }
      }

      if (columns.length === 0) {
        columns = customColumns.filter((c) => c.trim() !== "");
        sampleData = customRows;
      }
    } else {
      columns = selectedTpl.columns;
      sampleData = selectedTpl.sampleRows;
    }

    mutation.mutate({
      id: userId,
      name: data.name,
      templateData: { columns, data: sampleData },
    });
  };

  // Export custom template as JSON file — reads live data from Syncfusion spreadsheet
  const handleExportTemplate = () => {
    let columns: string[] = [];
    let rows: string[][] = [];

    const ss = spreadsheetRef.current;
    if (ss && ss.getActiveSheet) {
      try {
        const sheet = ss.getActiveSheet();
        const sheetRows = sheet?.rows || [];

        // Row 0 = headers
        const headerRow = sheetRows[0];
        if (headerRow?.cells) {
          columns = headerRow.cells
            .map((c: any) => c?.value ?? "")
            .filter((v: string) => v.trim() !== "");
        }

        // Row 1+ = data rows
        for (let r = 1; r < sheetRows.length; r++) {
          const row = sheetRows[r];
          if (!row?.cells) continue;
          const rowData = row.cells
            .slice(0, columns.length)
            .map((c: any) => c?.value ?? "");
          if (rowData.some((v: string) => v.trim() !== "")) {
            rows.push(rowData);
          }
        }
      } catch (err) {
        console.warn("Failed to read spreadsheet data for export:", err);
      }
    }

    // Fallback to React state if spreadsheet extraction failed
    if (columns.length === 0) {
      columns = customColumns;
      rows = customRows;
    }

    if (columns.length === 0) {
      alert("No columns to export. Add some headers in the spreadsheet first.");
      return;
    }

    const templateData = {
      name: "Custom Template",
      columns,
      sampleRows: rows,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import custom template from JSON file — clears sheet then maps all data
  const handleImportTemplate = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.columns && Array.isArray(data.columns)) {
            // Update React state
            setCustomColumns(data.columns);
            setCustomRows(data.sampleRows || [[]]);
            setSelectedTemplateId("custom");

            // Clear the Syncfusion spreadsheet and populate with imported data
            setTimeout(() => {
              const ss = spreadsheetRef.current;
              if (!ss) return;
              try {
                // Clear all used cells in the active sheet
                const sheet = ss.getActiveSheet?.();
                if (sheet?.usedRange) {
                  const lastRow = sheet.usedRange.rowIndex || 50;
                  const lastCol = sheet.usedRange.colIndex || 20;
                  const clearRange = `A1:${colLetter(lastCol)}${lastRow + 1}`;
                  ss.clear?.({ range: clearRange, type: "Clear All" });
                }

                // Write header row (Row 1)
                data.columns.forEach((col: string, colIdx: number) => {
                  const cellAddr = `${colLetter(colIdx)}1`;
                  ss.updateCell(
                    { value: col, style: { fontWeight: "bold", backgroundColor: "#e2e8f0" } },
                    cellAddr
                  );
                });

                // Write data rows (Row 2+)
                const rows = data.sampleRows || [];
                rows.forEach((row: any[], rowIdx: number) => {
                  row.forEach((cell: any, colIdx: number) => {
                    const cellAddr = `${colLetter(colIdx)}${rowIdx + 2}`;
                    ss.updateCell({ value: String(cell ?? "") }, cellAddr);
                  });
                });
              } catch (err) {
                console.warn("Syncfusion import populate warning:", err);
              }
            }, 500);
          } else {
            alert("Invalid template file. Must contain a 'columns' array.");
          }
        } catch {
          alert("Failed to parse template file. Please use a valid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCellFormat = (style: Record<string, any>) => {
    const ss = spreadsheetRef.current;
    if (!ss) return;
    try {
      if (ss.cellFormat) {
        const activeSheet = ss.getActiveSheet?.();
        const selectRange = activeSheet?.selectedRange || activeSheet?.activeCell || "A1:Z50";
        ss.cellFormat(style, selectRange);
      }
    } catch (err) {
      console.warn("Cell format error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-primary gap-1.5 font-semibold">
          <Plus className="size-4" /> Create Workflow
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-7xl w-[96vw] max-h-[95vh] h-[90vh] dark bg-zinc-950 border-zinc-800/80 text-zinc-100 p-0 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b border-zinc-800/80 px-6 py-3.5 bg-zinc-950 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="size-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Create Workflow Project & MasterSheet
            </h2>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
        </div>

        <Form {...methods}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              methods.handleSubmit(handleCreateSubmit)(e);
            }}
            className="flex-1 flex min-h-0 overflow-hidden"
          >
            {/* LEFT SIDE (1/3 Width) - Project Details & Template Selector */}
            <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-zinc-800/80 bg-zinc-950 p-5 flex flex-col justify-between overflow-y-auto space-y-6 flex-shrink-0">
              <div className="space-y-6">
                {/* 1. Naming Section */}
                <div className="space-y-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                    1. Project Details
                  </span>
                  <FormField
                    control={methods.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-medium text-zinc-300">
                          Workflow Project Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Q3 Student Grade Sheet"
                            className="h-9 bg-zinc-900 border-zinc-800 focus:border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-md focus-visible:ring-1 focus-visible:ring-zinc-700"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.preventDefault();
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 2. Sheet Selector Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      2. Sheet Template
                    </span>
                    {selectedTemplateId === "custom" && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 font-mono">
                        Tools Active
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {TEMPLATE_OPTIONS.map((tpl) => {
                      const isSelected = selectedTemplateId === tpl.id;
                      const Icon = tpl.icon;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`cursor-pointer p-3 rounded-lg border transition-all duration-150 flex items-center justify-between ${
                            isSelected
                              ? "border-zinc-700 bg-zinc-800/80 text-zinc-100 shadow-none"
                              : "border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-7 rounded-md flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-zinc-700 text-zinc-100"
                                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                              }`}
                            >
                              <Icon className="size-3.5" />
                            </div>
                            <div>
                              <h4
                                className={`text-xs font-medium transition-colors ${
                                  isSelected ? "text-zinc-100" : "text-zinc-300"
                                }`}
                              >
                                {tpl.name}
                              </h4>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                {tpl.columns.length} columns
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="size-3.5 text-zinc-300" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Template Import / Export Section */}
                {selectedTemplateId === "custom" && (
                  <div className="space-y-3 pt-1 border-t border-zinc-800/60">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                      3. Custom Template Actions
                    </span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Export your configured sheet layout as JSON to reuse across projects, or import a pre-saved template.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleImportTemplate}
                        className="flex-1 gap-1.5 h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
                      >
                        <Upload className="size-3.5 text-zinc-400" />
                        Import Template
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportTemplate}
                        className="flex-1 gap-1.5 h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
                      >
                        <Download className="size-3.5 text-zinc-400" />
                        Export Template
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-2.5">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-9"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !methods.watch("name")?.trim()}
                  className="flex-1 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs h-9 shadow-sm"
                >
                  {mutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>

            {/* RIGHT SIDE (2/3 Width) - Full-Height Syncfusion Spreadsheet Preview */}
            <div className="flex-1 bg-zinc-950 flex flex-col min-h-0 h-full overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-3.5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-300">
                    MasterSheet Preview — {selectedTpl.name}
                  </span>
                </div>

                {/* Formatting Quick Tools */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCellFormat({ textAlign: "Center" })}
                    className="px-2 py-0.5 text-[11px] rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors font-mono"
                    title="Align Center"
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCellFormat({ textAlign: "Left" })}
                    className="px-2 py-0.5 text-[11px] rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors font-mono"
                    title="Align Left"
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCellFormat({ textAlign: "Right" })}
                    className="px-2 py-0.5 text-[11px] rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors font-mono"
                    title="Align Right"
                  >
                    Right
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCellFormat({ fontWeight: "Bold" })}
                    className="px-2 py-0.5 text-[11px] rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors font-bold"
                    title="Bold"
                  >
                    B
                  </button>
                  <span className="text-[10px] text-zinc-500 font-mono ml-2">
                    {selectedTemplateId === "custom"
                      ? "Custom Mode: Ribbon Tools Enabled"
                      : "Read-only Preview Mode"}
                  </span>
                </div>
              </div>

              {/* Syncfusion Spreadsheet Full Height Instance */}
              <div className="flex-1 w-full h-full min-h-0 bg-white">
                {isMounted && open ? (
                  <SpreadsheetComponent
                    key={`${selectedTemplateId}-${open}`}
                    ref={spreadsheetRef}
                    className="w-full h-full"
                    height="100%"
                    width="100%"
                    sheets={[{ name: "Sheet1", showGridLines: true }]}
                    showRibbon={selectedTemplateId === "custom"}
                    showFormulaBar={selectedTemplateId === "custom"}
                    allowEditing={true}
                    allowOpen={false}
                    allowSave={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-500 text-xs font-mono">
                    Loading spreadsheet...
                  </div>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
