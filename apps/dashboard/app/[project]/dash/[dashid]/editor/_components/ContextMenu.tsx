import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@repo/ui/components/ui/context-menu";
import { useNodeId } from "@xyflow/react";
import { useCallback } from "react";
import { set } from "zod";
import { AlertBox } from "../../_components/settings/slert-asling";

export function ContextMenuDemo({ children }: { children: React.ReactNode }) {
  const nodeId = useNodeId();
  const { setNodes, setEdges } = useEditorWorkFlow();
  const handelDeleteEdgesOnly = useCallback(() => {
    setEdges((edges) => []);
  }, [nodeId, setEdges]);
  const handleDeleteAllNodesandEdges = useCallback(() => {
    setNodes((nodes) => []);
    setEdges((edges) => []);
  }, [nodeId, setNodes, setEdges]);
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-full w-full items-center justify-center ">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem inset>
          Back
          <ContextMenuShortcut>⌘[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset disabled>
          Forward
          <ContextMenuShortcut>⌘]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset>
          Reload
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>More Tools</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem>Save Page...</ContextMenuItem>
            <ContextMenuItem>Create Shortcut...</ContextMenuItem>
            <ContextMenuItem>Name Window...</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Developer Tools</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" asChild>
              <AlertBox
                title="Are you sure?"
                description="This action cannot be undone. This will permanently delete your account from our servers."
                canecelTitle="cancel"
                continueTitle="confirm delete"
                triggerTitle="Delete"
                variant="ghost"
                handleDeleteAllNodesandEdges={handleDeleteAllNodesandEdges}
              />
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>
          Show Bookmarks
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value="pedro">
          <ContextMenuLabel inset>People</ContextMenuLabel>
          <ContextMenuRadioItem value="pedro" onClick={handelDeleteEdgesOnly}>
            delete all edges
          </ContextMenuRadioItem>
          <ContextMenuRadioItem
            value="colm"
            onClick={handleDeleteAllNodesandEdges}
          >
            delete all nodes
          </ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
