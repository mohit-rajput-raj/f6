"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/ui/resizable";
import Flow from "./reactFlow";
import { TabsDemo } from "./tabs";
import { useUIStore } from "@/stores/ui.store";
import { Button } from "@repo/ui/components/ui/button";
import {
  Play,
  Zap,
  Undo2,
  Redo2,
  Save,
  Download,
  Upload,
  Square,
  PanelRight,
  PanelBottom,
} from "lucide-react";
import {
  EditorWorkFlowContextProvider,
  useEditorWorkFlow,
} from "@/context/WorkFlowContextProvider";
import { useSession } from "@/lib/auth-client";
import { usegetWorkFlow } from "../_actions/editor.queryes";
import { useParams } from "next/navigation";
import { executeWorkflow } from "./nodes/executions/nodeExecutions";
import React from "react";
import { TabsBottom } from "./tabsBottom";
import { SidebarTrigger } from "@repo/ui/components/ui/sidebar";
import type { EditorNodeType } from "@/lib/types";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";
import { RoseLoader } from "curls-loaders";
import { runWorkflow, cancelWorkflow } from "@/lib/server-api";
import { useExecutionSocket, type WorkflowEvent } from "@/lib/use-execution-socket";
import { useExecutionStore } from "@/stores/execution.store";

interface WorkFlowEditorProps {
  workflowId?: string;
  initialNodes?: EditorNodeType[];
  initialEdges?: Edge[];
  deskBlockId?: string;
}

export function WorkFlowEditor({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  deskBlockId,
}: WorkFlowEditorProps) {
  return (
    <EditorWorkFlowContextProvider
      workflowId={workflowId}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      deskBlockId={deskBlockId}
    >
      <WorkFlowEditorInner />
    </EditorWorkFlowContextProvider>
  );
}

function WorkFlowEditorInner() {
  const params = useParams();
  const flowId = params?.dashid as string | undefined;

  if (!flowId) {
    console.error("No dashid found in URL params:", params);
    return (
      <div className="p-10 text-red-600">
        Error: Missing dashboard/flow ID in the URL.
        <br />
        Expected URL format: / [project] / dash / [your-flow-id] / editor
      </div>
    );
  }

  const { setSidebarOpen, sidebarOpen, bottombarOpen, setBottombarOpen } =
    useUIStore();
  const { data: session, isPending } = useSession();
  const {
    edges,
    nodes,
    setEdges,
    setNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    pushHistory,
    saveToDb,
    isSaving,
    hasUnsavedChanges,
    workflowId,
  } = useEditorWorkFlow();
  const [isRunning, setIsRunning] = React.useState(false);
  const [isServerRunning, setIsServerRunning] = React.useState(false);

  // ── Server-side execution store ──
  const addRun = useExecutionStore((s) => s.addRun);
  const updateNodeState = useExecutionStore((s) => s.updateNodeState);
  const updateRunStatus = useExecutionStore((s) => s.updateRunStatus);
  const addRunError = useExecutionStore((s) => s.addRunError);
  const setWorkflowError = useExecutionStore((s) => s.setWorkflowError);
  const clearWorkflowError = useExecutionStore((s) => s.clearWorkflowError);
  const activeRunId = useExecutionStore((s) => s.activeRunId);
  const activeRun = useExecutionStore((s) =>
    s.activeRunId ? s.runs[s.activeRunId] : null,
  );

  // ── WebSocket for real-time execution events ──
  const handleExecutionEvent = React.useCallback(
    (event: WorkflowEvent) => {
      const { runId, type, nodeId, nodeType, data, error, timestamp } = event;

      switch (type) {
        case "node_started":
          if (nodeId) {
            updateNodeState(runId, nodeId, {
              nodeType: nodeType || "unknown",
              status: "running",
              startedAt: timestamp,
            });
          }
          break;

        case "node_completed":
          if (nodeId) {
            updateNodeState(runId, nodeId, {
              status: "completed",
              output: data,
              completedAt: timestamp,
            });
          }
          break;

        case "node_error":
          if (nodeId) {
            updateNodeState(runId, nodeId, {
              status: "error",
              error: error,
              completedAt: timestamp,
            });
            addRunError({
              nodeId,
              nodeType: nodeType || "unknown",
              error: error || "Unknown error",
              timestamp,
            });
          }
          break;

        case "node_skipped":
          if (nodeId) {
            updateNodeState(runId, nodeId, { status: "skipped" });
          }
          break;

        case "workflow_completed":
          updateRunStatus(runId, "completed", {
            completedAt: timestamp,
          });
          setIsServerRunning(false);
          toast.success("Server execution completed");
          break;

        case "workflow_error":
          updateRunStatus(runId, "error", {
            error: error,
            completedAt: timestamp,
          });
          setIsServerRunning(false);
          toast.error(`Server execution failed: ${error || "Unknown error"}`);
          break;

        case "workflow_paused":
          updateRunStatus(runId, "paused", {
            pausedRequest: data,
          });
          toast.info("Workflow paused — waiting for input");
          break;

        case "workflow_cancelled":
          updateRunStatus(runId, "cancelled");
          setIsServerRunning(false);
          toast.info("Server execution cancelled");
          break;
      }
    },
    [updateNodeState, updateRunStatus, addRunError],
  );

  useExecutionSocket({
    userId: session?.user?.id,
    enabled: !!session?.user?.id,
    onEvent: handleExecutionEvent,
  });

  if (isPending) {
    return <RoseLoader
      size={141}
      color="#707070"
      secondaryColor="#00313d"
      speed={3.5}
      strokeWidth={3}
      petals={10}
      denominator={4}
    />;
  }

  // ── Local execution (existing) ──
  const handleRuns = async () => {
    clearWorkflowError();
    if (!nodes || nodes.length === 0) {
      setWorkflowError({
        message: "Workflow has no nodes",
        code: "INTERNAL_ERROR",
        details: { reason: "The canvas is empty. Drag and drop nodes from the sidebar." },
      });
      setBottombarOpen(false); // Make sure bottom bar is visible
      toast.error("Workflow has no nodes");
      return;
    }

    setIsRunning(true);
    try {
      await executeWorkflow(nodes, edges, setNodes);
      // Check if any node failed
      const failed = nodes.find((n) => (n.data as any)?.error || ((n.data as any)?.errors && (n.data as any).errors.length > 0));
      if (failed) {
        setWorkflowError({
          message: (failed.data as any)?.error || `${failed.type} execution error`,
          code: "NODE_ERROR",
          nodeId: failed.id,
          nodeType: failed.type,
          details: (failed.data as any)?.errors || (failed.data as any)?.error,
        });
        setBottombarOpen(false);
      }
    } catch (err: any) {
      setWorkflowError({
        message: err?.message || "Local workflow execution failed",
        code: "EXECUTION_ERROR",
        details: err?.stack || err,
      });
      setBottombarOpen(false);
      toast.error(err?.message || "Local execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  // ── Server execution (new) ──
  const handleServerRun = async () => {
    clearWorkflowError();
    const activeWfId = workflowId || flowId;
    if (!activeWfId || !session?.user?.id) {
      toast.error("Missing workflow ID or user session");
      return;
    }

    // Save before running on server
    if (hasUnsavedChanges) {
      await saveToDb();
    }

    setIsServerRunning(true);

    const result = await runWorkflow({
      workflowId: activeWfId,
      userId: session.user.id,
      dashid: flowId!,
    });

    if (result.success && result.data?.runId) {
      addRun({
        runId: result.data.runId,
        workflowId: activeWfId,
        totalNodes: nodes.length,
      });
      toast.success(`Execution started (Run: ${result.data.runId.slice(0, 8)}…)`);
    } else {
      setIsServerRunning(false);
      const errObj = {
        message: result.error || "Workflow execution failed to start",
        code: result.errorObj?.code || "INTERNAL_ERROR",
        details: result.errorObj?.details || result.errorObj,
      };
      setWorkflowError(errObj);
      setBottombarOpen(false); // Open bottom panel so the user sees the error!
      toast.error(`Failed to start: ${result.error || "Unknown error"}`);
    }
  };

  const handleCancelServerRun = async () => {
    if (!activeRunId) return;
    const result = await cancelWorkflow(activeRunId);
    if (result.success) {
      setIsServerRunning(false);
      toast.info("Run cancelled");
    } else {
      toast.error(`Cancel failed: ${result.error}`);
    }
  };

  return (
    <div className="flex flex-col w-full h-full gap-2 text-foreground">
      {/* ─── Sleek Control Toolbar (Dual Mode, No Emojis, No Emerald) ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-card text-card-foreground rounded-xl border border-border/40 shadow-xs gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <SidebarTrigger className="-ml-1" />

          {/* Execution Controls */}
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/30">
            <Button
              size="sm"
              onClick={handleRuns}
              disabled={isRunning || isServerRunning}
              className="h-7 px-2.5 text-xs font-medium gap-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-md shadow-2xs cursor-pointer"
            >
              <Play className="size-3 fill-current" />
              <span>{isRunning ? "Running..." : "Local Run"}</span>
            </Button>

            {isServerRunning ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancelServerRun}
                className="h-7 px-2.5 text-xs font-medium gap-1.5 rounded-md cursor-pointer"
              >
                <Square className="size-3 fill-current" />
                <span>Cancel</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleServerRun}
                disabled={isRunning || isServerRunning}
                className="h-7 px-2.5 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
              >
                <Zap className="size-3 text-foreground" />
                <span>Server Run</span>
              </Button>
            )}
          </div>

          {activeRun && (
            <span className="text-[11px] text-muted-foreground font-mono px-2 py-0.5 bg-muted/60 rounded-md border border-border/30">
              {activeRun.completedNodes}/{activeRun.totalNodes} nodes •{" "}
              <span className="font-semibold text-foreground uppercase text-[10px]">
                {activeRun.status}
              </span>
            </span>
          )}

          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* History Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
            title="Undo"
          >
            <Undo2 className="size-3.5 mr-1" />
            <span>Undo</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
            title="Redo"
          >
            <Redo2 className="size-3.5 mr-1" />
            <span>Redo</span>
          </Button>

          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            size="sm"
            onClick={saveToDb}
            disabled={isSaving || !hasUnsavedChanges}
            className={`h-7 px-2.5 text-xs font-medium gap-1.5 rounded-md transition-all cursor-pointer ${
              hasUnsavedChanges
                ? "bg-foreground text-background hover:bg-foreground/90 shadow-2xs"
                : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Save className="size-3" />
            <span>{isSaving ? "Saving..." : hasUnsavedChanges ? "Save*" : "Saved"}</span>
          </Button>

          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* Import / Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const activeWfId = workflowId || flowId;
              const data = JSON.stringify(
                { nodes, edges, meta: { exportedAt: new Date().toISOString(), workflowId: activeWfId } },
                null,
                2
              );
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `workflow-${activeWfId?.slice(0, 8) ?? "export"}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Workflow exported");
            }}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/40 rounded-md cursor-pointer"
            title="Export Workflow JSON"
          >
            <Download className="size-3 mr-1" />
            <span>Export</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = (e: any) => {
                const file = e.target?.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const parsed = JSON.parse(reader.result as string);
                    if (parsed.nodes && parsed.edges) {
                      pushHistory();
                      setNodes(parsed.nodes);
                      setEdges(parsed.edges);
                      toast.success("Workflow imported successfully");
                    } else {
                      toast.error("Invalid workflow file — missing nodes or edges");
                    }
                  } catch {
                    toast.error("Failed to parse workflow file");
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/40 rounded-md cursor-pointer"
            title="Import Workflow JSON"
          >
            <Upload className="size-3 mr-1" />
            <span>Import</span>
          </Button>
        </div>

        {/* Panel Toggles */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`h-7 w-7 p-0 rounded-md cursor-pointer transition-colors ${
              !sidebarOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Nodes Panel"
          >
            <PanelRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBottombarOpen(!bottombarOpen)}
            className={`h-7 w-7 p-0 rounded-md cursor-pointer transition-colors ${
              !bottombarOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Execution & Inspection Panel"
          >
            <PanelBottom className="size-4" />
          </Button>
        </div>
      </div>

      {/* ─── Resizable Panels Group (Clean, theme-adaptive) ─── */}
      <ResizablePanelGroup
        direction="vertical"
        className="flex-1 w-full rounded-2xl border border-border/40 bg-card overflow-hidden shadow-xs min-h-[400px]"
      >
        <ResizablePanel defaultSize={70} minSize={20} maxSize={90}>
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full w-full"
          >
            <ResizablePanel defaultSize={72} minSize={20} maxSize={88}>
              <div className="flex h-full w-full bg-background/40 relative">
                <Flow handleRuns={handleRuns} />
              </div>
            </ResizablePanel>

            <ResizableHandle className="bg-border/30 hover:bg-border transition-colors w-1" />

            <ResizablePanel
              defaultSize={28}
              minSize={15}
              maxSize={50}
              className={`${sidebarOpen ? "hidden" : ""}`}
            >
              <div className="flex h-full w-full bg-card border-l border-border/40 overflow-hidden flex-col">
                <TabsDemo />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle className="bg-border/30 hover:bg-border transition-colors h-1" />

        <ResizablePanel
          defaultSize={30}
          minSize={10}
          maxSize={80}
          className={`${bottombarOpen ? "hidden" : ""}`}
        >
          <div className="flex h-full w-full bg-card border-t border-border/40 overflow-hidden">
            <TabsBottom />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
