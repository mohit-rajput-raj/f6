"use client";

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
import { useState, useEffect } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
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
import { useRouter } from "next/navigation";
import { useRouteAuthContextHook } from "@/context/routeContext";
import { useSession } from "@/lib/auth-client";
import { useAllWorkFlow } from "@/app/[project]/dash/[dashid]/editor/_actions/editor.queryes";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/ui/form";
import { Input } from "@repo/ui/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
export const ProjectList = () => {
  const router = useRouter();
  const { setDashid } = useRouteAuthContextHook();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
const {dashid,setDashidValue} = useEditorStore();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: allWorkflows = [], isLoading, refetch, isRefetching } = useAllWorkFlow(userId!);

  const deletemutation = useMutation({
    mutationFn: async ({ id, flowId }: { id: string; flowId: string }) => {
      return await deleteWorkFlow({ id, flowId });
    },
    onSuccess: () => {
      setDeletingId(null);
      refetch()
    },
    onError: () => {
      setDeletingId(null);
      alert("Failed to delete workflow.");
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

  const filtered = allWorkflows.filter((wf: any) =>
    wf.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoute = (id: string) => {
    if (!id) return;
    setDashidValue(id);
    window.open(`/dashboard/dash/${id}/editor`, "_blank");
  };

  const onDelete = (flowId: string) => {
    if (!userId) return;
    setDeletingId(flowId); 
    deletemutation.mutate({ id: userId, flowId });
  };

  return (
    <div className="space-y-4 p-10">
      <div className="flex justify-between gap-10 items-center">
        <CreateWorkFlow />
        <Input
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((workflow: any) => (
                <TableRow
                  key={workflow.id} // ✅ Changed from workflow.name to workflow.id
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRoute(workflow.id)}
                >
                  <TableCell className="font-semibold">{workflow.name}</TableCell>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
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
import {
  CreateWorkFlowFormProps,
  CreateWorkFlowFormSchema,
} from "@/zodschema/workflows";
import {
  createWorkFlow,
  deleteWorkFlow,
} from "@/app/[project]/dash/[dashid]/editor/_actions/editor.service";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEditorStore } from "@/stores/user.store";
export const CreateWorkFlow = () => {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const { refetch } = useAllWorkFlow(userId!);
  const methods = useForm<CreateWorkFlowFormProps>({
    resolver: zodResolver(CreateWorkFlowFormSchema),
    defaultValues: {
      name: "",
    },
  });
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return await createWorkFlow({ id, name });
    },

    onSuccess: (newWorkflow) => {
      refetch();
      setOpen(false);
      window.open(`/dashboard/dash/${newWorkflow.id}/editor`, "_blank");

      methods.reset();
    },
  });
  const onSubmit = (data: CreateWorkFlowFormProps) => {
    if (!userId) return;

    mutation.mutate({
      id: userId,
      name: data.name,
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-primary">
          Create Workflow
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>
            Add a name to create a new workflow.
          </DialogDescription>
        </DialogHeader>

        <Form {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={methods.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter workflow name"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>

              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
