'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Workflow, Settings2, ArrowRightFromLine, ArrowLeftFromLine } from 'lucide-react';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs";

interface SubflowConfig {
  publishedWorkflowId?: string;
  blockCode?: string;
}

interface InputSchemaItem {
  nodeId: string;
  type: string;
  label: string;
  dataType: string;
  description: string;
  requiredColumns?: string;
}

interface OutputSchemaItem {
  nodeId: string;
  type: string;
  label: string;
  dataType: string;
  description: string;
}

interface SubflowData {
  title?: string;
  description?: string;
  config?: SubflowConfig;
  result?: any;
  rowCount?: number;
  inputColumns?: string[];
  publishedName?: string;
  publishedIcon?: string;
  publishedDefinition?: any;
  inputSchema?: InputSchemaItem[];
  outputSchema?: OutputSchemaItem[];
  error?: string;
}

export const SubflowNode = memo(({ id, data }: { id: string; data: SubflowData }) => {
  const { setNodes } = useReactFlow();
  const handleDelete = useDeleteNode();
  const [sheetOpen, setSheetOpen] = useState(false);

  const config = data.config || {};
  const inputSchema = data.inputSchema ?? [];
  const outputSchema = data.outputSchema ?? [];

  const updateConfig = useCallback((updates: Partial<SubflowConfig>) => {
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <BaseNode className="min-w-[220px] max-w-[280px] cursor-pointer hover:shadow-lg transition-shadow">
            {/* Gradient header */}
            <BaseNodeHeader className="border-b flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-md">
              <span className="text-lg">{data.publishedIcon || '⚡'}</span>
              <BaseNodeHeaderTitle className="text-white text-sm">
                {data.publishedName || data.title || 'Subflow'}
              </BaseNodeHeaderTitle>
              <Badge variant="outline" className="text-[10px] border-white/30 text-white/80 ml-auto">
                Workflow
              </Badge>
            </BaseNodeHeader>

            <BaseNodeContent className="p-3 space-y-2">
              {/* Input/Output summary */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ArrowRightFromLine className="size-3 text-emerald-400" />
                  {inputSchema.length} input{inputSchema.length !== 1 ? 's' : ''}
                </span>
                {outputSchema.length > 0 && (
                  <span className="flex items-center gap-1">
                    <ArrowLeftFromLine className="size-3 text-amber-400" />
                    {outputSchema.length} output{outputSchema.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Input labels */}
              {inputSchema.map((inp, i) => (
                <div key={i} className="text-[10px] text-emerald-500 truncate">
                  📥 {inp.label}
                </div>
              ))}

              {/* Output labels */}
              {outputSchema.map((out, i) => (
                <div key={i} className="text-[10px] text-amber-500 truncate">
                  📤 {out.label}
                </div>
              ))}

              {/* Status */}
              {data.error && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-1.5 rounded">
                  ⚠ {data.error}
                </div>
              )}

              {data.rowCount !== undefined && (
                <div className="text-xs text-emerald-600 font-medium text-center pt-2 border-t">
                  {data.rowCount} rows output
                </div>
              )}

              <p className="text-[9px] text-muted-foreground text-center">Click to inspect</p>
            </BaseNodeContent>

            {/* Dynamic INPUT handles — one per inputSchema item */}
            {inputSchema.map((inp, i) => (
              <Handle
                key={`in-${inp.nodeId}`}
                type="target"
                position={Position.Left}
                id={`subflow-in-${inp.nodeId}`}
                className="w-3 h-3 bg-emerald-500"
                style={{
                  top: `${30 + ((i + 1) / (inputSchema.length + 1)) * 70}%`,
                }}
              />
            ))}

            {/* Dynamic OUTPUT handles — one per outputSchema item */}
            {outputSchema.map((out, i) => (
              <Handle
                key={`out-${out.nodeId}`}
                type="source"
                position={Position.Right}
                id={`subflow-out-${out.nodeId}`}
                className="w-3 h-3 bg-amber-500"
                style={{
                  top: `${30 + ((i + 1) / (outputSchema.length + 1)) * 70}%`,
                }}
              />
            ))}
          </BaseNode>
        </SheetTrigger>

        {/* ─── Detail Sheet ─── */}
        <SheetContent className="w-[400px] sm:w-[500px] dark bg-zinc-950 border-l border-zinc-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">{data.publishedIcon || '⚡'}</span>
              {data.publishedName || 'Subflow'}
            </SheetTitle>
            <SheetDescription>
              {data.description || 'Installed published workflow'}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="inputs" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="inputs" className="flex-1">📥 Inputs ({inputSchema.length})</TabsTrigger>
              <TabsTrigger value="outputs" className="flex-1">📤 Outputs ({outputSchema.length})</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">⚙️ Settings</TabsTrigger>
            </TabsList>

            {/* Inputs tab */}
            <TabsContent value="inputs" className="space-y-4 mt-4">
              {inputSchema.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inputs defined</p>
              ) : (
                inputSchema.map((inp, i) => (
                  <div key={i} className="p-4 rounded-lg border border-emerald-900/30 bg-emerald-950/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <ArrowRightFromLine className="size-4 text-emerald-400" />
                      <span className="font-medium text-sm text-emerald-300">{inp.label}</span>
                      <Badge variant="outline" className="text-[10px] border-emerald-800 text-emerald-500 ml-auto">
                        {inp.dataType}
                      </Badge>
                    </div>
                    {inp.description && (
                      <p className="text-xs text-muted-foreground">{inp.description}</p>
                    )}
                    {inp.requiredColumns && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Required columns: </span>
                        <span className="text-emerald-400 font-mono">{inp.requiredColumns}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Outputs tab */}
            <TabsContent value="outputs" className="space-y-4 mt-4">
              {outputSchema.length === 0 ? (
                <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 text-center">
                  <p className="text-sm text-muted-foreground">No output defined</p>
                  <p className="text-xs text-muted-foreground mt-1">This workflow performs actions only — no data is returned.</p>
                </div>
              ) : (
                outputSchema.map((out, i) => (
                  <div key={i} className="p-4 rounded-lg border border-amber-900/30 bg-amber-950/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <ArrowLeftFromLine className="size-4 text-amber-400" />
                      <span className="font-medium text-sm text-amber-300">{out.label}</span>
                      <Badge variant="outline" className="text-[10px] border-amber-800 text-amber-500 ml-auto">
                        {out.dataType}
                      </Badge>
                    </div>
                    {out.description && (
                      <p className="text-xs text-muted-foreground">{out.description}</p>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Settings tab */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Settings2 className="size-3" />
                  Block / Subject Code
                </Label>
                <Input
                  value={config.blockCode ?? ''}
                  onChange={e => updateConfig({ blockCode: e.target.value })}
                  placeholder="e.g. CS101"
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Used to prefix columns when pushing to a main sheet
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Published Workflow ID</Label>
                <p className="text-xs font-mono text-muted-foreground bg-zinc-900 p-2 rounded break-all">
                  {config.publishedWorkflowId || '—'}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
});

SubflowNode.displayName = "SubflowNode";
