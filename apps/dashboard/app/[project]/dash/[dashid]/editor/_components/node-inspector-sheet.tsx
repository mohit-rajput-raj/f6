'use client';

import { useUIStore } from "@/stores/ui.store";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@repo/ui/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs";
import { Badge } from "@repo/ui/components/ui/badge";
import { useMemo } from "react";

export function NodeInspectorSheet() {
  const { selectedNodeId, setSelectedNodeId } = useUIStore();
  const { nodes, edges } = useEditorWorkFlow();

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const nodeData = selectedNode?.data as any;

  // Find incoming data from upstream nodes
  const incomingEdges = useMemo(
    () => edges.filter(e => e.target === selectedNodeId),
    [edges, selectedNodeId]
  );

  const outgoingEdges = useMemo(
    () => edges.filter(e => e.source === selectedNodeId),
    [edges, selectedNodeId]
  );

  // Get upstream node results for "Input Data" tab
  const upstreamData = useMemo(() => {
    return incomingEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const sourceData = (sourceNode?.data as any)?.result;
      return {
        sourceId: edge.source,
        sourceType: sourceNode?.type ?? 'Unknown',
        sourceTitle: (sourceNode?.data as any)?.title ?? sourceNode?.type ?? 'Unknown',
        handleId: edge.sourceHandle,
        data: sourceData,
      };
    });
  }, [incomingEdges, nodes]);

  if (!selectedNode) return null;

  const result = nodeData?.result;
  const isDataset = result && typeof result === "object" && Array.isArray(result.columns);

  return (
    <Sheet open={!!selectedNodeId} onOpenChange={(open) => {
      if (!open) setSelectedNodeId(null);
    }}>
      <SheetContent
        side="bottom"
        className="dark bg-zinc-950 border-t border-zinc-800 h-[45vh] overflow-y-auto"
      >
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {selectedNode.type}
            </Badge>
            <span>{nodeData?.title || selectedNode.type}</span>
            {nodeData?.rowCount !== undefined && (
              <Badge className="bg-emerald-900 text-emerald-300 text-[10px]">
                {nodeData.rowCount} rows
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Node ID: {selectedNode.id.slice(0, 8)}… • {incomingEdges.length} input(s) • {outgoingEdges.length} output(s)
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="input" className="mt-2">
          <TabsList>
            <TabsTrigger value="input">📥 Input Data</TabsTrigger>
            <TabsTrigger value="output">📤 Output Data</TabsTrigger>
            <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
          </TabsList>

          {/* Input Data Tab */}
          <TabsContent value="input" className="mt-3">
            {upstreamData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incoming connections</p>
            ) : (
              <div className="space-y-4">
                {upstreamData.map((upstream, i) => (
                  <div key={i} className="border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-emerald-400">
                        From: {upstream.sourceTitle}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {upstream.sourceType}
                      </Badge>
                    </div>
                    {upstream.data && typeof upstream.data === "object" && Array.isArray(upstream.data.columns) ? (
                      <DataPreviewTable columns={upstream.data.columns} rows={upstream.data.data} />
                    ) : upstream.data ? (
                      <pre className="text-xs bg-zinc-900 p-2 rounded overflow-x-auto max-h-40">
                        {typeof upstream.data === "string" ? upstream.data : JSON.stringify(upstream.data, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground">No data yet — execute the workflow first</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Output Data Tab */}
          <TabsContent value="output" className="mt-3">
            {nodeData?.error && (
              <div className="text-sm text-red-500 bg-red-950 p-3 rounded-lg mb-3">
                ⚠ {nodeData.error}
              </div>
            )}
            {isDataset ? (
              <DataPreviewTable columns={result.columns} rows={result.data} />
            ) : result ? (
              <pre className="text-xs bg-zinc-900 p-3 rounded overflow-x-auto max-h-60">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">No output data yet — execute the workflow first</p>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-3">
            {nodeData?.config ? (
              <div className="space-y-3">
                {Object.entries(nodeData.config).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 border-b border-zinc-800 pb-2">
                    <span className="text-xs font-medium text-muted-foreground min-w-[120px]">{key}</span>
                    <span className="text-xs font-mono text-white break-all">
                      {typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No settings configured</p>
            )}

            {/* Show inputColumns if available */}
            {nodeData?.inputColumns && nodeData.inputColumns.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Available Columns</p>
                <div className="flex flex-wrap gap-1">
                  {nodeData.inputColumns.map((col: string) => (
                    <Badge key={col} variant="outline" className="text-[10px]">{col}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─── Data Preview Table ─────────────────────────
function DataPreviewTable({ columns, rows }: { columns: string[]; rows: any[][] }) {
  const previewRows = rows.slice(0, 10);

  return (
    <div className="overflow-x-auto border border-zinc-800 rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            {columns.map((col, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, ri) => (
            <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
              {columns.map((_, ci) => (
                <td key={ci} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 10 && (
        <div className="text-center text-[10px] text-muted-foreground py-2 border-t border-zinc-800">
          Showing 10 of {rows.length} rows
        </div>
      )}
    </div>
  );
}
