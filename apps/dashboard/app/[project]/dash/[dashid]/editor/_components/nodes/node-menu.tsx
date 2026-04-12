import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import { Button } from "@repo/ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"
import { IconMenu } from "@tabler/icons-react";
import { useNodeId, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useDeleteNode } from "./settings/triggers";
import { v4 } from "uuid";
import { toast } from "sonner";
import { Copy, Lock, Unlock, Trash2, ClipboardCopy } from "lucide-react";

export function NodeMenu() {
  const handleDelete = useDeleteNode();
  const nodeId = useNodeId();
  const { setNodes, pushHistory, setEdges } = useEditorWorkFlow();

  const handleDuplicate = useCallback(() => {
    if (!nodeId) return;
    pushHistory();
    setNodes((nds) => {
      const original = nds.find((n) => n.id === nodeId);
      if (!original) return nds;

      const newNode = {
        ...original,
        id: v4(),
        position: {
          x: original.position.x + 40,
          y: original.position.y + 40,
        },
        data: {
          ...original.data,
          result: undefined,
          error: undefined,
          rowCount: undefined,
        },
      };
      return [...nds, newNode];
    });
    toast.success("Node duplicated");
  }, [nodeId, setNodes, pushHistory]);

  const handleCopyConfig = useCallback(() => {
    if (!nodeId) return;
    setNodes((nds) => {
      const node = nds.find((n) => n.id === nodeId);
      if (!node?.data?.config) {
        toast.error("No config to copy");
        return nds;
      }
      navigator.clipboard.writeText(JSON.stringify(node.data.config, null, 2));
      toast.success("Config copied to clipboard");
      return nds;
    });
  }, [nodeId, setNodes]);
  const handelDeleteEdges = useCallback(() => {
    if (!nodeId) return;

    pushHistory();

    setEdges((eds) =>
      eds.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      )
    );
  }, [nodeId, setEdges, pushHistory]);
  const handleToggleLock = useCallback(() => {
    if (!nodeId) return;
    pushHistory();
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          const isLocked = n.data?.locked ?? false;
          toast.success(isLocked ? "Node unlocked" : "Node locked");
          return {
            ...n,
            draggable: isLocked,
            data: { ...n.data, locked: !isLocked },
          };
        }
        return n;
      })
    );
  }, [nodeId, setNodes, pushHistory]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost"><IconMenu className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44" align="start">
        <DropdownMenuLabel>Node Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="size-3.5 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyConfig}>
            <ClipboardCopy className="size-3.5 mr-2" />
            Copy Config
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleLock}>
            <Lock className="size-3.5 mr-2" />
            Toggle Lock
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
            <Trash2 className="size-3.5 mr-2" />
            Delete
            <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handelDeleteEdges} className="text-red-600 focus:text-red-600">
            <Trash2 className="size-3.5 mr-2" />
            Delete all edges
            <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
