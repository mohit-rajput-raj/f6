'use client';

import React, { useState, useEffect } from 'react';
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
import { useExecutionStore } from "@/stores/execution.store";
import { EditorNodeType } from "@/lib/types";
import {
  Code2,
  Table2,
  Copy,
  Check,
  Layers,
  MousePointerClick,
  FileJson,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export function TabsBottom() {
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useUIStore((s) => s.setSelectedNodeId);
  const { nodes } = useEditorWorkFlow();

  // Execution store
  const lastWorkflowError = useExecutionStore((s) => s.lastWorkflowError);
  const clearWorkflowError = useExecutionStore((s) => s.clearWorkflowError);
  const runErrors = useExecutionStore((s) => s.runErrors);
  const activeRunId = useExecutionStore((s) => s.activeRunId);
  const activeRun = useExecutionStore((s) =>
    s.activeRunId ? s.runs[s.activeRunId] : null,
  );

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("data-json");

  // Effective workflow-level error from store or active run
  const effectiveWorkflowError =
    lastWorkflowError ||
    (activeRun?.status === "error" && activeRun?.error
      ? {
          message: activeRun.error,
          code: "SERVER_EXECUTION_ERROR",
          timestamp: activeRun.completedAt || new Date().toISOString(),
        }
      : null);

  // Find the currently selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Extract tabular dataset if available in node.data.result or node.data.text
  const nodeData = (selectedNode?.data as any) || null;
  const hasNodeError = Boolean(
    nodeData?.error || (nodeData?.errors && nodeData.errors.length > 0),
  );
  const hasAnyError = Boolean(
    hasNodeError || effectiveWorkflowError || runErrors.length > 0,
  );

  useEffect(() => {
    if (hasNodeError || effectiveWorkflowError) {
      setActiveTab("errors");
    } else if (
      nodeData?.result?.columns &&
      Array.isArray(nodeData?.result?.data)
    ) {
      setActiveTab("table-view");
    }
  }, [selectedNodeId, hasNodeError, effectiveWorkflowError, nodeData?.result]);

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
            {selectedNode ? "Node Data Preview" : "Execution & Inspection"}
          </span>

          {selectedNode ? (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Badge
                variant="secondary"
                className="text-[10px] font-mono px-1.5 py-0 h-5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 truncate"
              >
                {selectedNode.type}
              </Badge>
              {hasNodeError && (
                <Badge
                  variant="destructive"
                  className="text-[10px] font-mono px-1.5 py-0 h-5 bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1"
                >
                  <AlertCircle className="size-3" />
                  Status 500
                </Badge>
              )}
              <span
                className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]"
                title={selectedNode.id}
              >
                ID: {selectedNode.id}
              </span>
            </div>
          ) : effectiveWorkflowError ? (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Badge
                variant="destructive"
                className="text-[10px] font-mono px-1.5 py-0 h-5 bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1"
              >
                <AlertCircle className="size-3" />
                {effectiveWorkflowError.code || "INTERNAL_ERROR"}
              </Badge>
              <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={effectiveWorkflowError.message}>
                {effectiveWorkflowError.message}
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
          {effectiveWorkflowError && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearWorkflowError}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Clear Error
            </Button>
          )}
          {selectedNode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyJson(selectedNode.data)}
                className="h-6 px-2 text-[10px] gap-1 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-3 text-green-400" />
                ) : (
                  <Copy className="size-3" />
                )}
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
                <TabsTrigger
                  value="data-json"
                  className="text-[11px] h-6 px-2.5 gap-1 data-[state=active]:bg-background"
                >
                  <Code2 className="size-3 text-indigo-400" />
                  Node Data JSON
                </TabsTrigger>
                {resultDataset && (
                  <TabsTrigger
                    value="table-view"
                    className="text-[11px] h-6 px-2.5 gap-1 data-[state=active]:bg-background"
                  >
                    <Table2 className="size-3 text-emerald-400" />
                    Table ({resultDataset.data.length} rows)
                  </TabsTrigger>
                )}
                {hasAnyError && (
                  <TabsTrigger
                    value="errors"
                    className="text-[11px] h-6 px-2.5 gap-1 data-[state=active]:bg-background text-red-500 font-semibold"
                  >
                    <AlertCircle className="size-3 text-red-500" />
                    Errors{" "}
                    {nodeData?.errors?.length
                      ? `(${nodeData.errors.length})`
                      : effectiveWorkflowError
                        ? `(1)`
                        : ""}
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="full-node"
                  className="text-[11px] h-6 px-2.5 gap-1 data-[state=active]:bg-background"
                >
                  <Layers className="size-3 text-amber-400" />
                  Full Node Object
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content: node.data JSON */}
            <TabsContent
              value="data-json"
              className="flex-1 m-0 p-2 overflow-auto font-mono text-xs"
            >
              <div className="rounded-md border border-border/60 bg-zinc-950 p-2.5 text-zinc-200">
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap word-break-all">
                  {JSON.stringify(selectedNode.data, null, 2)}
                </pre>
              </div>
            </TabsContent>

            {/* Tab Content: Table View */}
            {resultDataset && (
              <TabsContent
                value="table-view"
                className="flex-1 m-0 p-2 overflow-auto"
              >
                <div className="rounded-md border border-border overflow-hidden bg-background">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/80 sticky top-0 border-b">
                        <th className="px-2 py-1 text-left font-medium text-muted-foreground w-10 border-r">
                          #
                        </th>
                        {resultDataset.columns.map((col: string, i: number) => (
                          <th
                            key={i}
                            className="px-2.5 py-1 text-left font-semibold text-foreground border-r last:border-r-0 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultDataset.data.map((row: any[], ri: number) => (
                        <tr
                          key={ri}
                          className="border-b border-border/40 hover:bg-muted/30"
                        >
                          <td className="px-2 py-0.5 text-muted-foreground text-[10px] font-mono border-r">
                            {ri + 1}
                          </td>
                          {resultDataset.columns.map((_: any, ci: number) => (
                            <td
                              key={ci}
                              className="px-2.5 py-0.5 border-r border-border/40 last:border-r-0 whitespace-nowrap font-mono text-[11px]"
                            >
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

            {/* Tab Content: Errors View */}
            {hasAnyError && (
              <TabsContent
                value="errors"
                className="flex-1 m-0 p-3 overflow-auto space-y-3"
              >
                {/* Workflow-level error banner */}
                {effectiveWorkflowError && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300">
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs text-red-600 dark:text-red-400">
                          Workflow Level Error ({effectiveWorkflowError.code || "INTERNAL_ERROR"})
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {effectiveWorkflowError.timestamp
                            ? new Date(effectiveWorkflowError.timestamp).toLocaleTimeString()
                            : ""}
                        </span>
                      </div>
                      <div className="text-[11px] leading-relaxed font-mono font-medium text-foreground bg-background/60 p-1.5 rounded">
                        {effectiveWorkflowError.message}
                      </div>
                      {effectiveWorkflowError.details && (
                        <div className="mt-1.5 rounded border border-border/60 bg-zinc-950 p-2 text-zinc-300 font-mono text-[10px] max-h-32 overflow-auto">
                          <pre className="whitespace-pre-wrap word-break-all">
                            {typeof effectiveWorkflowError.details === "string"
                              ? effectiveWorkflowError.details
                              : JSON.stringify(effectiveWorkflowError.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Node-level error */}
                {nodeData?.error && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300">
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
                    <div className="space-y-1">
                      <div className="font-semibold text-xs text-red-600 dark:text-red-400">
                        Node Execution Error (Status 500)
                      </div>
                      <div className="text-[11px] leading-relaxed">
                        {nodeData.error}
                      </div>
                    </div>
                  </div>
                )}

                {Array.isArray(nodeData?.errors) && nodeData.errors.length > 0 && (
                  <div className="rounded-md border border-border overflow-hidden bg-background">
                    <div className="px-3 py-1.5 bg-muted/60 border-b flex items-center justify-between text-xs">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        Failed Items ({nodeData.errors.length})
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-red-500 border-red-500/30"
                      >
                        Status 500
                      </Badge>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b text-[11px]">
                          <th className="px-2.5 py-1 text-left font-medium border-r w-12">
                            #
                          </th>
                          <th className="px-2.5 py-1 text-left font-medium border-r">
                            Key
                          </th>
                          <th className="px-2.5 py-1 text-left font-medium border-r">
                            Target / Email
                          </th>
                          <th className="px-2.5 py-1 text-left font-medium border-r w-16">
                            Status
                          </th>
                          <th className="px-2.5 py-1 text-left font-medium">
                            Error Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {nodeData.errors.map((errItem: any, idx: number) => (
                          <tr
                            key={idx}
                            className="border-b last:border-b-0 hover:bg-red-500/5"
                          >
                            <td className="px-2.5 py-1 border-r text-muted-foreground font-mono text-[10px]">
                              {idx + 1}
                            </td>
                            <td className="px-2.5 py-1 border-r font-mono font-medium">
                              {String(errItem?.key ?? "-")}
                            </td>
                            <td className="px-2.5 py-1 border-r font-mono text-muted-foreground truncate max-w-[150px]">
                              {String(errItem?.email ?? errItem?.target ?? "-")}
                            </td>
                            <td className="px-2.5 py-1 border-r">
                              <Badge
                                variant="destructive"
                                className="text-[9px] px-1 py-0 h-4"
                              >
                                {errItem?.status ?? 500}
                              </Badge>
                            </td>
                            <td className="px-2.5 py-1 text-red-600 dark:text-red-400 font-medium">
                              {errItem?.error ||
                                errItem?.message ||
                                "Unknown error"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            )}

            {/* Tab Content: Full Node Object */}
            <TabsContent
              value="full-node"
              className="flex-1 m-0 p-2 overflow-auto font-mono text-xs"
            >
              <div className="rounded-md border border-border/60 bg-zinc-950 p-2.5 text-zinc-200">
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap word-break-all">
                  {JSON.stringify(selectedNode, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : effectiveWorkflowError ? (
        /* Workflow-Level Error State when no node selected */
        <div className="flex-1 flex flex-col p-4 overflow-auto space-y-3 bg-muted/10">
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/20 text-red-500">
                  <AlertCircle className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-600 dark:text-red-400">
                    Workflow Execution Error
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    {effectiveWorkflowError.timestamp
                      ? new Date(effectiveWorkflowError.timestamp).toLocaleTimeString()
                      : "Just now"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="destructive" className="text-[10px] font-mono px-2 py-0.5">
                  {effectiveWorkflowError.code || "INTERNAL_ERROR"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-red-500/15"
                  onClick={clearWorkflowError}
                >
                  Clear Error
                </Button>
              </div>
            </div>

            <div className="text-xs font-semibold text-foreground bg-background/80 rounded-md p-2.5 border border-red-500/20 font-mono">
              {effectiveWorkflowError.message}
            </div>

            {effectiveWorkflowError.message.toLowerCase().includes("no nodes") && (
              <div className="text-[11px] text-muted-foreground bg-muted/60 rounded p-2 border border-border">
                💡 <strong>Tip:</strong> The canvas currently has no nodes. Drag and drop nodes from the sidebar on the right to build your pipeline before running.
              </div>
            )}

            {effectiveWorkflowError.details && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Diagnostic Details / Server Response:
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[9px] gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        typeof effectiveWorkflowError.details === "string"
                          ? effectiveWorkflowError.details
                          : JSON.stringify(effectiveWorkflowError.details, null, 2),
                      );
                      toast.success("Error details copied to clipboard");
                    }}
                  >
                    <Copy className="size-2.5" />
                    Copy
                  </Button>
                </div>
                <div className="rounded-md border border-border/80 bg-zinc-950 p-2.5 text-zinc-300 font-mono text-[10px] max-h-48 overflow-auto">
                  <pre className="whitespace-pre-wrap word-break-all">
                    {typeof effectiveWorkflowError.details === "string"
                      ? effectiveWorkflowError.details
                      : JSON.stringify(effectiveWorkflowError.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Quick Node Selector Chips */}
          {nodes.length > 0 && (
            <div className="pt-2 flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground mb-1">
                Or inspect an existing node on canvas:
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
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
            </div>
          )}
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