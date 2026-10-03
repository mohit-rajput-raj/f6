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
import { IconDirectionHorizontal } from "@tabler/icons-react";
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
    <>
      <div className="flex justify-between">
        <div className="flex gap-1">
          <SidebarTrigger className="-ml-1" />

          <Button onClick={handleRuns} disabled={isRunning || isServerRunning}>
            {isRunning ? "Running..." : "▶ Local"}
          </Button>
          {isServerRunning ? (
            <Button
              variant="destructive"
              onClick={handleCancelServerRun}
              className="gap-1"
            >
              ⏹ Cancel Server
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleServerRun}
              disabled={isRunning || isServerRunning}
              className="gap-1 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            >
              ⚡ Server Run
            </Button>
          )}
          {activeRun && (
            <span className="text-xs text-muted-foreground self-center font-mono">
              {activeRun.completedNodes}/{activeRun.totalNodes} nodes •{" "}
              <span
                className={`font-semibold ${
                  activeRun.status === "completed"
                    ? "text-emerald-500"
                    : activeRun.status === "error"
                      ? "text-red-500"
                      : activeRun.status === "running"
                        ? "text-blue-500"
                        : "text-muted-foreground"
                }`}
              >
                {activeRun.status}
              </span>
            </span>
          )}
          <Button
            variant="outline"
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            onClick={redo}
            disabled={!canRedo}
          >
            Redo
          </Button>
          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            onClick={saveToDb}
            disabled={isSaving || !hasUnsavedChanges}
            className={hasUnsavedChanges ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
          >
            {isSaving ? "Saving..." : hasUnsavedChanges ? "💾 Save*" : "💾 Saved"}
          </Button>
          <Button
            variant="outline"
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
          >
            📥 Export
          </Button>
          <Button
            variant="outline"
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
          >
            📤 Import
          </Button>
        </div>
        <div>
          <Button
            variant={"ghost"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <IconDirectionHorizontal />
          </Button>
          <Button
            variant={"ghost"}
            onClick={() => setBottombarOpen(!bottombarOpen)}
          >
            <IconDirectionHorizontal className="rotate-z-90" />
          </Button>
        </div>
      </div>
      <ResizablePanelGroup
        direction="vertical"
        className="min-h-[200px] w-full rounded-lg border md:min-w-[450px]"
      >
        <ResizablePanel defaultSize={70} minSize={0} maxSize={90}>
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full w-full rounded-lg border"
          >
            <ResizablePanel defaultSize={70} minSize={10} maxSize={85}>
              <div className="flex h-full w-full items-center justify-center">
                <Flow handleRuns={handleRuns} />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel
              defaultSize={30}
              minSize={15}
              maxSize={90}
              className={`${sidebarOpen ? "hidden" : ""}`}
            >
              <div className="flex h-full w-full p-1 min-w-[250px] overflow-y-scroll flex-col ">
                <TabsDemo />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel
          defaultSize={30}
          minSize={10}
          maxSize={100}
          className={`${bottombarOpen ? "hidden" : ""}`}
        >
          <div className="flex h-full w-full p-1 min-w-[250px]">
            <TabsBottom />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
