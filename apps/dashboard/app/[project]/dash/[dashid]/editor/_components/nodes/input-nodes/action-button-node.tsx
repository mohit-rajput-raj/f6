'use client';

import { memo, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { useDeskStore } from '@/stores/desk-store';
import { useEditorWorkFlow } from '@/context/WorkFlowContextProvider';

/**
 * ActionButtonNode — desk-aware button that appears in the MasterSheet panel.
 * 
 * When placed in a desk block editor:
 * - Registers an "action button" in the desk store
 * - The button appears above the MasterSheet panel on the desk page
 * - When clicked from the desk, it sets a trigger flag in the store
 * - During workflow execution, outputs `true` when triggered, `false` otherwise
 * 
 * data.deskBlockId  = ID of the parent DeskBlock
 * data.actionId     = unique ID of this action button in the desk store
 * data.placeholder  = button label text (editable)
 */
export const ActionButtonNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const defaultHandleDelete = useDeleteNode();
  const { deskBlockId: contextBlockId } = useEditorWorkFlow();
  const actionId: string = data.actionId || id;
  const deskBlockId: string = data.deskBlockId || contextBlockId || '';
  const placeholder: string = data.placeholder ?? 'Save MasterSheet';

  const handleDelete = useCallback(() => {
    if (deskBlockId) {
      useDeskStore.getState().removeActionButton(deskBlockId, actionId);
    }
    defaultHandleDelete();
  }, [deskBlockId, actionId, defaultHandleDelete]);

  // Auto-register in desk store on mount
  useEffect(() => {
    if (!deskBlockId) return;
    const store = useDeskStore.getState();
    const block = store.blocks.find(b => b.id === deskBlockId);
    if (block && !block.actionButtons?.find(a => a.id === actionId)) {
      store.addActionButton(deskBlockId, {
        id: actionId,
        label: placeholder,
        nodeId: id,
        triggered: false,
      });

      // Update node data if actionId wasn't stored
      if (!data.actionId) {
        setNodes(nds => nds.map(node =>
          node.id === id ? { ...node, data: { ...node.data, actionId } } : node
        ));
      }
    }
  }, [id, deskBlockId, actionId, placeholder, data.actionId, setNodes]);

  // Read triggered state from desk store
  const isTriggered = useDeskStore((s) => {
    if (!deskBlockId) return false;
    const block = s.blocks.find(b => b.id === deskBlockId);
    return block?.actionButtons?.find(a => a.id === actionId)?.triggered ?? false;
  });

  const updatePlaceholder = useCallback((newPlaceholder: string) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, placeholder: newPlaceholder } } : node
      )
    );
    // Also update in desk store
    if (deskBlockId) {
      useDeskStore.getState().updateActionButtonLabel(deskBlockId, actionId, newPlaceholder);
    }
  }, [id, setNodes, deskBlockId, actionId]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="w-[240px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-t-md">
          <Zap className="size-4" />
          <BaseNodeHeaderTitle className="text-white text-sm">
            {placeholder}
          </BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {/* Editable button label */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Button Label
            </label>
            <input
              value={placeholder}
              onChange={(e) => updatePlaceholder(e.target.value)}
              className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-rose-500 nodrag"
              placeholder="e.g. Save MasterSheet"
            />
          </div>

          {/* Trigger status */}
          <div className={`text-xs rounded px-2 py-1.5 text-center font-medium ${isTriggered
            ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-600'
            : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-muted-foreground'
            }`}>
            {isTriggered ? '⚡ Triggered!' : '⏸ Waiting for click...'}
          </div>

          {!deskBlockId && (
            <p className="text-[9px] text-amber-500 text-center">
              ⚠ No block ID. Open this editor from a desk block.
            </p>
          )}

          <p className="text-[9px] text-muted-foreground text-center">
            🔘 Creates a button on the Desk's MasterSheet panel
          </p>
        </BaseNodeContent>

        {/* Output: true when triggered, false otherwise */}
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-rose-600" />
      </BaseNode>
    </>
  );
});

ActionButtonNode.displayName = 'ActionButtonNode';
