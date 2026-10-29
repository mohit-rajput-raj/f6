'use client';

import { memo, useCallback } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { ArrowDownUp } from 'lucide-react';
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
import { Label } from "@repo/ui/components/ui/label";

interface AppendConfig {
  mode?: 'match' | 'all';
}

export const AppendNode = memo(({ id, data }: { id: string; data: any }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();

  const config: AppendConfig = data.config || { mode: 'all' };

  const updateConfig = useCallback((updates: Partial<AppendConfig>) => {
    const newConfig = { ...config, ...updates };
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, config: newConfig } } : n
      )
    );
  }, [id, setNodes, config]);

  return (
    <BaseNode variant="combine" className="min-w-[280px]">
      <BaseNodeHeader variant="combine">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="combine">
            <ArrowDownUp className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>Append (Stack)</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-3">
        <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
          Stack two datasets vertically (SQL UNION). Combine data from different periods or sections.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Column mode</Label>
          <div className="flex gap-1.5 p-0.5 rounded-lg bg-muted/50 border border-border/40">
            <button
              onClick={() => updateConfig({ mode: 'all' })}
              className={`flex-1 text-xs py-1 rounded-md font-medium transition cursor-pointer nodrag ${
                config.mode === 'all' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All columns
            </button>
            <button
              onClick={() => updateConfig({ mode: 'match' })}
              className={`flex-1 text-xs py-1 rounded-md font-medium transition cursor-pointer nodrag ${
                config.mode === 'match' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Matching only
            </button>
          </div>
        </div>

        {data.rowCount !== undefined && (
          <div className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-medium text-center pt-2 border-t border-border/40">
            {data.rowCount} rows stacked
          </div>
        )}
      </BaseNodeContent>

      <NodeHandle variant="combine" type="target" position={Position.Left} id="left" style={{ top: '35%' }} />
      <NodeHandle variant="combine" type="target" position={Position.Left} id="right" style={{ top: '65%' }} />
      <NodeHandle variant="combine" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

AppendNode.displayName = "AppendNode";
