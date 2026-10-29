'use client';

import { memo, useCallback, useEffect } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { TextCursorInput } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeIcon,
  NodeHeaderActions,
  NodeHandle,
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
export const DeskTextInputNode = memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
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
    <BaseNode variant="input" selected={selected} className="w-[250px]">
      <BaseNodeHeader variant="input">
        <BaseNodeIcon variant="input">
          <TextCursorInput className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>{placeholder}</BaseNodeHeaderTitle>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-2.5">
        {/* Editable placeholder label */}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Label / Placeholder
          </label>
          <input
            value={placeholder}
            onChange={(e) => updatePlaceholder(e.target.value)}
            className="w-full h-7 px-2 text-xs border border-border/60 rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500 nodrag"
            placeholder="e.g. Student Name"
          />
        </div>

        {/* Current value display */}
        <div className="text-xs bg-muted/40 border border-border/50 rounded-md px-2.5 py-1.5 min-h-[30px] flex items-center">
          {currentValue ? (
            <span className="text-foreground font-mono text-[11px] truncate">
              → &ldquo;{currentValue}&rdquo;
            </span>
          ) : (
            <span className="text-muted-foreground italic text-[11px]">
              Waiting for desk input...
            </span>
          )}
        </div>

        {!deskBlockId && (
          <p className="text-[9px] text-muted-foreground/80 text-center">
            ⚠ No block ID set. Open this editor from a desk block.
          </p>
        )}

        <p className="text-[10px] text-sky-600 dark:text-sky-400 text-center font-medium">
          Value linked from Desk panel
        </p>
      </BaseNodeContent>

      <NodeHandle
        variant="input"
        type="source"
        position={Position.Right}
        id="out"
      />
    </BaseNode>
  );
});

DeskTextInputNode.displayName = 'DeskTextInputNode';

