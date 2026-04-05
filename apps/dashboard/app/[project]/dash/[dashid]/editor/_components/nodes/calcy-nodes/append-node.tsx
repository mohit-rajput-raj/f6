'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ArrowDownUp } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
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
    <>
      <div className="flex justify-between items-center px-2 pt-1">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      <BaseNode className="min-w-[280px]">
        <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-1.5 bg-violet-700 text-white">
          <ArrowDownUp className="size-4" />
          <BaseNodeHeaderTitle>Append (Stack)</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent className="p-4 space-y-3">
          <p className="text-[10px] text-muted-foreground bg-violet-50 dark:bg-violet-950 p-2 rounded">
            Stack two datasets vertically (like SQL UNION). Combine data from different sections or time periods with the same columns.
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Column Mode</Label>
            <div className="flex gap-2">
              <button
                onClick={() => updateConfig({ mode: 'all' })}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  config.mode === 'all' ? 'bg-violet-600 text-white' : 'bg-background hover:bg-muted'
                }`}
              >
                All columns (fill nulls)
              </button>
              <button
                onClick={() => updateConfig({ mode: 'match' })}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  config.mode === 'match' ? 'bg-violet-600 text-white' : 'bg-background hover:bg-muted'
                }`}
              >
                Matching columns only
              </button>
            </div>
          </div>

          {data.rowCount !== undefined && (
            <div className="text-xs text-violet-600 font-medium text-center pt-2 border-t">
              {data.rowCount} rows stacked
            </div>
          )}
        </BaseNodeContent>

        <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-violet-600" style={{ top: '35%' }} />
        <Handle type="target" position={Position.Left} id="right" className="w-3 h-3 bg-violet-400" style={{ top: '65%' }} />
        <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-violet-600" />
      </BaseNode>
    </>
  );
});

AppendNode.displayName = "AppendNode";
