'use client';

import { memo, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ToggleLeft } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { useDeskStore } from '@/stores/desk-store';

/**
 * TrueFalseNode — when dropped in a block's editor, generates a checkbox
 * field on the parent desk block.
 *
 * data.deskBlockId = ID of the parent DeskBlock
 * data.checkboxLabel = label for the checkbox
 * data.checkboxId = unique ID for the checkbox field
 */
export const TrueFalseNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const defaultHandleDelete = useDeleteNode();
  const checkboxId: string = data.checkboxId || id;
  const checkboxLabel: string = data.checkboxLabel ?? 'Toggle';
  const deskBlockId: string = data.deskBlockId ?? '';

  const handleDelete = useCallback(() => {
    // Remove checkbox field from desk store
    if (deskBlockId) {
      const store = useDeskStore.getState();
      store.removeCheckboxField(deskBlockId, checkboxId);
    }
    defaultHandleDelete();
  }, [deskBlockId, checkboxId, defaultHandleDelete]);

  // Auto-register checkbox in desk store on mount
  useEffect(() => {
    if (!deskBlockId) return;
    const store = useDeskStore.getState();
    const block = store.blocks.find(b => b.id === deskBlockId);
    if (block && !block.checkboxFields.find(f => f.id === checkboxId)) {
      store.addCheckboxField(deskBlockId, {
        id: checkboxId,
        label: checkboxLabel,
        checked: false,
        nodeId: id,
      });
    }

    // Update node data with checkboxId if not set
    if (!data.checkboxId) {
      setNodes(nds => nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, checkboxId } } : node
      ));
    }
  }, [id, checkboxId, checkboxLabel, deskBlockId, data.checkboxId, setNodes]);

  // Read live value from desk store
  const checkboxValue = useDeskStore((s) => {
    if (!deskBlockId) return false;
    const block = s.blocks.find(b => b.id === deskBlockId);
    return block?.checkboxFields.find(f => f.id === checkboxId)?.checked ?? false;
  });

  const updateLabel = useCallback((newLabel: string) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, checkboxLabel: newLabel } } : node
      )
    );
    // Also update in desk store
    if (deskBlockId) {
      const store = useDeskStore.getState();
      const block = store.blocks.find(b => b.id === deskBlockId);
      if (block) {
        const field = block.checkboxFields.find(f => f.id === checkboxId);
        if (field) {
          store.addCheckboxField(deskBlockId, { ...field, label: newLabel });
        }
      }
    }
  }, [id, setNodes, deskBlockId, checkboxId]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="w-[220px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
          <ToggleLeft className="size-4" />
          <BaseNodeHeaderTitle className="text-white text-sm">
            True / False
          </BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {/* Editable label */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Checkbox Label
            </label>
            <input
              value={checkboxLabel}
              onChange={(e) => updateLabel(e.target.value)}
              className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500 nodrag"
              placeholder="e.g. Include Header"
            />
          </div>

          {/* Current value display */}
          <div className={`text-xs border rounded px-2 py-1.5 text-center font-medium ${
            checkboxValue
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            {checkboxValue ? '✅ TRUE' : '❌ FALSE'}
          </div>

          {!deskBlockId && (
            <p className="text-[9px] text-amber-500 text-center">
              ⚠ No block ID set. Drop in a block editor to auto-link.
            </p>
          )}

          <p className="text-[9px] text-muted-foreground text-center">
            Checkbox appears on Desk block
          </p>
        </BaseNodeContent>

        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-indigo-600" />
      </BaseNode>
    </>
  );
});

TrueFalseNode.displayName = 'TrueFalseNode';
