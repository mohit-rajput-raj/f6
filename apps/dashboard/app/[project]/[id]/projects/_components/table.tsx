"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  FolderPlus,
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
    mutationFn: async ({
      id,
      name,
    }: {
      id: string;
      name: string;
    }) => {
      return await createWorkFlow({ id, name });
    },
    onSuccess: (newWorkflow) => {
      refetch();
      setOpen(false);
      methods.reset();
      router.push(`/dashboard/dash/${newWorkflow.id}/desk`);
    },
  });

  const handleCreateSubmit = async (data: CreateWorkFlowFormProps) => {
    if (!userId) return;
    mutation.mutate({
      id: userId,
      name: data.name,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-primary gap-1.5 font-semibold">
          <Plus className="size-4" /> Create Workflow
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md dark bg-zinc-950 border-zinc-800 text-zinc-100 p-6 flex flex-col gap-4 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FolderPlus className="size-5 text-zinc-400" />
            Create Workflow Project
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Enter a name for your new workflow project to get started.
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
                  <FormLabel className="text-xs font-medium text-zinc-300">
                    Workflow Project Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Q3 Student Grade Sheet"
                      className="h-9 bg-zinc-900 border-zinc-800 focus:border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-md focus-visible:ring-1 focus-visible:ring-zinc-700"
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
                  className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-9"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={mutation.isPending || !methods.watch("name")?.trim()}
                className="bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs h-9 shadow-sm"
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
