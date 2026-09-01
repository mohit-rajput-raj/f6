'use client';

import React, { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@/components/ui/components";
import { useUIStore } from "@/stores/ui.store";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import { EditorNodeType } from "@/lib/types";
import {
  Code2,
  Table2,
  Copy,
  Check,
  Sparkles,
  Layers,
  MousePointerClick,
  FileJson,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export function TabsBottom() {
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const { nodes } = useEditorWorkFlow();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("data-json");

  // Find the currently selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Extract tabular dataset if available in node.data.result or node.data.text
  const nodeData = (selectedNode?.data as any) || null;
  const resultDataset =
    nodeData?.result?.columns && Array.isArray(nodeData?.result?.data)
      ? nodeData.result
      : nodeData?.text?.columns && Array.isArray(nodeData?.text?.data)
      ? nodeData.text
      : null;

  const handleCopyJson = (content: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      setCopied(true);
      toast.success("JSON copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  return (
    <div className="flex w-full h-full flex-col bg-card border rounded-lg overflow-hidden shadow-inner text-foreground">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b shrink-0 gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1 rounded bg-indigo-500/10 text-indigo-400">
            <FileJson className="size-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
            Node Data Preview
          </span>

          {selectedNode ? (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 truncate">
                {selectedNode.type}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]" title={selectedNode.id}>
                ID: {selectedNode.id}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">
              No node selected
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {selectedNode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyJson(selectedNode.data)}
                className="h-6 px-2 text-[10px] gap-1 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNodeId(null)}
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Deselect
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Body */}
      {selectedNode ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Tabs List */}
            <div className="px-3 pt-1 border-b bg-background/50 flex items-center justify-between shrink-0">
              <TabsList className="h-7 bg-muted/60 p-0.5">
                <TabsTrigger value="data-json" className="text-[11px] h-6 px-2.5 gap-1 data-[state=active]:bg-background">
                  <Code2 className="size-3 text-indigo-400" />
                  Node Data JSON
                </TabsTrigger>
                {resultDataset && (
                  <TabsTrigger value="table-view" className="text-[11px] h-6 px-2.5 gap-1 data-[state=active]:bg-background">
                    <Table2 className="size-3 text-emerald-400" />
                    Table ({resultDataset.data.length} rows)
                  </TabsTrigger>
                )}
                <TabsTrigger value="full-node" className="text-[11px] h-6 px-2.5 gap-1 data-[state=active]:bg-background">
                  <Layers className="size-3 text-amber-400" />
                  Full Node Object
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content: node.data JSON */}
            <TabsContent value="data-json" className="flex-1 m-0 p-2 overflow-auto font-mono text-xs">
              <div className="rounded-md border border-border/60 bg-zinc-950 p-2.5 text-zinc-200">
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap word-break-all">
                  {JSON.stringify(selectedNode.data, null, 2)}
                </pre>
              </div>
            </TabsContent>

            {/* Tab Content: Table View */}
            {resultDataset && (
              <TabsContent value="table-view" className="flex-1 m-0 p-2 overflow-auto">
                <div className="rounded-md border border-border overflow-hidden bg-background">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/80 sticky top-0 border-b">
                        <th className="px-2 py-1 text-left font-medium text-muted-foreground w-10 border-r">
                          #
                        </th>
                        {resultDataset.columns.map((col: string, i: number) => (
                          <th key={i} className="px-2.5 py-1 text-left font-semibold text-foreground border-r last:border-r-0 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultDataset.data.map((row: any[], ri: number) => (
                        <tr key={ri} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="px-2 py-0.5 text-muted-foreground text-[10px] font-mono border-r">
                            {ri + 1}
                          </td>
                          {resultDataset.columns.map((_: any, ci: number) => (
                            <td key={ci} className="px-2.5 py-0.5 border-r border-border/40 last:border-r-0 whitespace-nowrap font-mono text-[11px]">
                              {String(row[ci] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            )}

            {/* Tab Content: Full Node Object */}
            <TabsContent value="full-node" className="flex-1 m-0 p-2 overflow-auto font-mono text-xs">
              <div className="rounded-md border border-border/60 bg-zinc-950 p-2.5 text-zinc-200">
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap word-break-all">
                  {JSON.stringify(selectedNode, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center gap-2 overflow-auto">
          <div className="p-2.5 rounded-full bg-muted/60 text-muted-foreground mb-1">
            <MousePointerClick className="size-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            Click any node on the canvas
          </p>
          <p className="text-[11px] text-muted-foreground max-w-sm">
            Its configuration, input properties, computed updates, and raw JSON data will appear here in real-time.
          </p>

          {/* Quick Node Selector Chips */}
          {nodes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center max-w-md">
              {nodes.map((node: EditorNodeType) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="px-2 py-1 rounded text-[10px] font-mono bg-muted/80 hover:bg-muted border border-border/60 text-foreground transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="text-indigo-400 font-semibold">{node.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}