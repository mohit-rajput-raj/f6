'use client';

import { memo, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { TextCursorInput } from 'lucide-react';
import {
  BaseNode, BaseNodeContent, BaseNodeHeader, BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { useDeskStore } from '@/stores/desk-store';
import { useEditorWorkFlow } from '@/context/WorkFlowContextProvider';

/**
 * DeskTextInputNode — receives text from a desk panel input field.
 * 
 * data.deskBlockId  = ID of the parent DeskBlock
 * data.deskInputId  = ID of the corresponding DeskTextInput in desk-store
 * data.placeholder  = editable placeholder text (becomes the node label)
 * data.text         = current value (synced from desk store)
 */
export const DeskTextInputNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const defaultHandleDelete = useDeleteNode();
  const { deskBlockId: contextBlockId } = useEditorWorkFlow();
  const deskInputId: string = data.deskInputId || id;
  const deskBlockId: string = data.deskBlockId || contextBlockId || '';
  const placeholder: string = data.placeholder ?? 'Text Input';

  const handleDelete = useCallback(() => {
    if (deskBlockId) {
      useDeskStore.getState().removeTextInput(deskBlockId, deskInputId);
    }
    defaultHandleDelete();
  }, [deskBlockId, deskInputId, defaultHandleDelete]);

  // Auto-register in desk store on mount
  useEffect(() => {
    if (!deskBlockId) return;
    const store = useDeskStore.getState();
    if (!store.getTextInputById(deskBlockId, deskInputId)) {
      store.addTextInput(deskBlockId, placeholder, deskInputId);
      
      // Update node data to hold the ID if it wasn't there
      if (!data.deskInputId) {
        setNodes(nds => nds.map(node => 
          node.id === id ? { ...node, data: { ...node.data, deskInputId } } : node
        ));
      }
    }
  }, [id, deskBlockId, deskInputId, placeholder, data.deskInputId, setNodes]);

  // Read live value from desk store
  const currentValue = useDeskStore((s) => {
    if (!deskBlockId) return data.text ?? '';
    const block = s.blocks.find(b => b.id === deskBlockId);
    return block?.textInputs.find(t => t.id === deskInputId)?.value ?? data.text ?? '';
  });

  const updatePlaceholder = useCallback((newPlaceholder: string) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === id ? { ...node, data: { ...node.data, placeholder: newPlaceholder } } : node
      )
    );
    // Also update in desk store
    if (deskBlockId) {
      useDeskStore.getState().updateTextInputPlaceholder(deskBlockId, deskInputId, newPlaceholder);
    }
  }, [id, setNodes, deskBlockId, deskInputId]);

  return (
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="w-[240px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white">
          <TextCursorInput className="size-4" />
          <BaseNodeHeaderTitle className="text-white text-sm">
            {placeholder}
          </BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-3 space-y-2">
          {/* Editable placeholder label */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Label / Placeholder
            </label>
            <input
              value={placeholder}
              onChange={(e) => updatePlaceholder(e.target.value)}
              className="w-full h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-teal-500 nodrag"
              placeholder="e.g. Student Name"
            />
          </div>

          {/* Current value display */}
          <div className="text-xs bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded px-2 py-1.5 min-h-[28px]">
            {currentValue ? (
              <span className="text-teal-700 dark:text-teal-300">→ "{currentValue}"</span>
            ) : (
              <span className="text-muted-foreground italic">Waiting for desk input...</span>
            )}
          </div>

          {!deskBlockId && (
            <p className="text-[9px] text-amber-500 text-center">
              ⚠ No block ID set. Open this editor from a desk block.
            </p>
          )}

          <p className="text-[9px] text-muted-foreground text-center">
            📝 Value set from Desk panel
          </p>
        </BaseNodeContent>

        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-teal-600" />
      </BaseNode>
    </>
  );
});

DeskTextInputNode.displayName = 'DeskTextInputNode';
