"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  FolderPlus,
  Search,
  Layers,
  Calendar,
  ExternalLink,
  CheckSquare,
  X,
  FileSpreadsheet,
} from "lucide-react";

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
  DropdownMenuSeparator,
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
import { Badge } from "@repo/ui/components/ui/badge";

import { useRouteAuthContextHook } from "@/context/routeContext";
import { useSession } from "@/lib/auth-client";
import { useAllWorkFlow } from "@/app/[project]/dash/[dashid]/editor/_actions/editor.queryes";
import {
  createWorkFlow,
  deleteWorkFlow,
  deleteMultipleWorkflows,
} from "@/app/[project]/dash/[dashid]/editor/_actions/editor.service";
import { useEditorStore } from "@/stores/user.store";
import {
  CreateWorkFlowFormProps,
  CreateWorkFlowFormSchema,
} from "@/zodschema/workflows";
import { UserAvatarStack } from "./membersListPictures";
import { ProjectInvitesBanner } from "./ProjectInvitesBanner";
import { toast } from "sonner";

/**
 * Formats timestamps into a clean, MNC-grade date string (e.g. "Sep 24, 2026")
 */
function formatCreatedDate(dateVal?: string | Date | null): string {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

export const ProjectList = () => {
  const router = useRouter();
  const { setDashid } = useRouteAuthContextHook();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const { setDashidValue } = useEditorStore();

  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const {
    data: allWorkflows = [],
    isLoading,
    refetch,
    isRefetching,
  } = useAllWorkFlow(userId!);

  const deletemutation = useMutation({
    mutationFn: async ({ id, flowId }: { id: string; flowId: string }) => {
      return await deleteWorkFlow({ id, flowId });
    },
    onSuccess: () => {
      setDeletingId(null);
      toast.success("Project deleted successfully");
      refetch();
    },
    onError: () => {
      setDeletingId(null);
      toast.error("Failed to delete project");
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async ({ id, flowIds }: { id: string; flowIds: string[] }) => {
      return await deleteMultipleWorkflows({ id, flowIds });
    },
    onSuccess: () => {
      const count = selectedIds.length;
      setSelectedIds([]);
      setSelectMode(false);
      toast.success(`Deleted ${count} project${count !== 1 ? "s" : ""}`);
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete selected projects");
    },
  });

  useEffect(() => {
    if (!isPending && !userId) {
      router.push("/");
    }
  }, [isPending, userId, router]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allWorkflows;
    const query = search.toLowerCase();
    return allWorkflows.filter((wf: any) =>
      wf.name?.toLowerCase().includes(query)
    );
  }, [allWorkflows, search]);

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
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} selected project(s)?`
      )
    )
      return;
    batchDeleteMutation.mutate({ id: userId, flowIds: selectedIds });
  };

  const enterSelectMode = (initialId: string) => {
    setSelectMode(true);
    setSelectedIds([initialId]);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const isAllSelected =
    filtered.length > 0 &&
    filtered.every((wf: any) => selectedIds.includes(wf.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
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

    if (next.length === 0) {
      setSelectMode(false);
    }
  };

  if (isPending || isLoading || isRefetching) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
        <p className="text-xs font-medium text-zinc-500">Loading workspaces...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
      {/* ── Pending Team Invites & Requests ── */}
      <ProjectInvitesBanner onInviteAccepted={() => refetch()} />

      {/* ── Top Header Section (MNC Corporate Standard) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Projects
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-700/60">
              {allWorkflows.length}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your visual workspaces, spreadsheet databases, and data automation flows.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-9 text-xs bg-zinc-50/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 rounded-lg placeholder:text-zinc-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <CreateWorkFlow />
        </div>
      </div>

      {/* ── Batch Selection Bar ── */}
      {selectMode && selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 px-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs animate-in fade-in-0 duration-200">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {selectedIds.length} project{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exitSelectMode}
              className="h-8 text-xs border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="h-8 text-xs gap-1.5 font-medium shadow-xs"
            >
              <Trash2 className="size-3.5" />
              {batchDeleteMutation.isPending
                ? "Deleting..."
                : `Delete Selected (${selectedIds.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Professional Data Table ── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40">
              {selectMode && (
                <TableHead className="w-[45px] text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="size-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                </TableHead>
              )}
              <TableHead className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase h-10">
                Project Name
              </TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase h-10">
                Collaborators
              </TableHead>
              <TableHead className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase h-10">
                Created
              </TableHead>
              <TableHead className="w-[50px] h-10 text-right pr-4"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((workflow: any) => {
                const isSelected = selectedIds.includes(workflow.id);
                return (
                  <TableRow
                    key={workflow.id}
                    className={`group cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-900/80 ${
                      isSelected
                        ? "bg-zinc-100/80 dark:bg-zinc-900/60"
                        : "hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30"
                    }`}
                    onClick={() =>
                      selectMode
                        ? toggleSelectOne(workflow.id)
                        : handleRoute(workflow.id)
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
                          className="size-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                        />
                      </TableCell>
                    )}

                    {/* Project Name Cell */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 shrink-0 transition-colors">
                          <Layers className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:underline underline-offset-2">
                            {workflow.name}
                          </span>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                            ID: {workflow.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Members Cell */}
                    <TableCell className="py-3.5">
                      <UserAvatarStack
                        users={workflow.users}
                        remainingCount={workflow.remainingCount}
                      />
                    </TableCell>

                    {/* Created Date Cell (Fixed & Formatted) */}
                    <TableCell className="py-3.5 text-xs text-zinc-600 dark:text-zinc-400 font-normal">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-zinc-400 shrink-0" />
                        <span>{formatCreatedDate(workflow.createdAt)}</span>
                      </div>
                    </TableCell>

                    {/* Actions Menu (Edit Option Removed) */}
                    <TableCell
                      className="py-3.5 text-right pr-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 shadow-md text-xs"
                        >
                          <DropdownMenuItem
                            onClick={() => handleRoute(workflow.id)}
                            className="gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-900"
                          >
                            <ExternalLink className="size-3.5 text-zinc-400" />
                            Open Desk
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => enterSelectMode(workflow.id)}
                            className="gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300 focus:bg-zinc-100 dark:focus:bg-zinc-900"
                          >
                            <CheckSquare className="size-3.5 text-zinc-400" />
                            Select
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-zinc-200 dark:bg-zinc-800" />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40 focus:text-red-600"
                            disabled={deletingId === workflow.id}
                            onClick={() => onDelete(workflow.id)}
                          >
                            <Trash2 className="size-3.5" />
                            {deletingId === workflow.id
                              ? "Deleting..."
                              : "Delete Project"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              /* Minimal Enterprise Empty State */
              <TableRow>
                <TableCell
                  colSpan={selectMode ? 5 : 4}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <div className="size-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
                      <FileSpreadsheet className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {search ? "No matching projects" : "No projects yet"}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {search
                          ? `No projects matching "${search}" were found. Try another search.`
                          : "Create your first project to begin building visual workflows and sheet integrations."}
                      </p>
                    </div>
                    {!search && <CreateWorkFlow />}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

/**
 * Clean, unrestricted Project Creation Dialog
 * No Polar restrictions, no 20-project limits!
 */
export const CreateWorkFlow = () => {
  const [open, setOpen] = useState(false);
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

  const mutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await createWorkFlow({ id, name });
    },
    onSuccess: (newWorkflow) => {
      refetch();
      setOpen(false);
      methods.reset();
      toast.success("Project created successfully");
      router.push(`/dashboard/dash/${newWorkflow.id}/desk`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create workflow project");
    },
  });

  const handleCreateSubmit = async (data: CreateWorkFlowFormProps) => {
    if (!userId) return;
    mutation.mutate({
      id: userId,
      name: data.name.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs h-9 px-3.5 gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="size-3.5 stroke-[2.5]" />
          <span>New Project</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 p-6 flex flex-col gap-5 shadow-xl rounded-xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <FolderPlus className="size-4.5 text-zinc-500" />
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Enter a descriptive title for your visual workspace and database.
          </DialogDescription>
        </DialogHeader>

        <Form {...methods}>
          <form
            onSubmit={methods.handleSubmit(handleCreateSubmit)}
            className="space-y-4"
          >
            <FormField
              control={methods.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Project Title *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Sales Pipeline & Commission Matrix"
                      className="h-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={mutation.isPending || !methods.watch("name")?.trim()}
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium text-xs h-9 px-4 shadow-xs cursor-pointer"
              >
                {mutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
