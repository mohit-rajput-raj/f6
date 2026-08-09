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
  } = useEditorWorkFlow();
  const [isRunning, setIsRunning] = React.useState(false);

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

  const handleRuns = async () => {
    setIsRunning(true);
    try {
      await executeWorkflow(nodes, edges, setNodes);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <div className="flex justify-between">
        <div className="flex gap-1">
          <SidebarTrigger className="-ml-1" />

          <Button onClick={handleRuns} disabled={isRunning}>
            {isRunning ? "Running..." : "▶ Execute"}
          </Button>
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
              const data = JSON.stringify(
                { nodes, edges, meta: { exportedAt: new Date().toISOString(), workflowId: flowId } },
                null,
                2
              );
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `workflow-${flowId?.slice(0, 8) ?? "export"}.json`;
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
