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
import { publishWorkflow } from "../_actions/publish.service";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";

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
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [publishName, setPublishName] = React.useState("");
  const [publishDesc, setPublishDesc] = React.useState("");
  const [publishIcon, setPublishIcon] = React.useState("⚡");
  const [isPublishing, setIsPublishing] = React.useState(false);

  if (isPending) {
    return <p className="p-10">Loading workflow...</p>;
  }

  const handleRuns = async () => {
    setIsRunning(true);
    try {
      await executeWorkflow(nodes, edges, setNodes);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePublish = async () => {
    if (!flowId || !session?.user?.id || !publishName.trim()) {
      toast.error("Please provide a workflow name");
      return;
    }
    setIsPublishing(true);
    try {
      await publishWorkflow({
        workflowId: flowId,
        publisherId: session.user.id,
        name: publishName.trim(),
        description: publishDesc.trim() || undefined,
        icon: publishIcon || "⚡",
        tags: [],
        categories: [],
      });
      toast.success("Workflow published to marketplace!");
      setPublishOpen(false);
      setPublishName("");
      setPublishDesc("");
    } catch (err: any) {
      console.error("Publish failed:", err);
      toast.error(err?.message || "Failed to publish workflow");
    } finally {
      setIsPublishing(false);
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
            onClick={() => setPublishOpen(true)}
          >
            📤 Publish
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
        {/* TOP SECTION */}
        <ResizablePanel defaultSize={70} minSize={0} maxSize={90}>
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full w-full rounded-lg border"
          >
            {/* LEFT PANEL */}
            <ResizablePanel defaultSize={70} minSize={10} maxSize={85}>
              <div className="flex h-full w-full items-center justify-center">
                <Flow handleRuns={handleRuns} />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* RIGHT PANEL */}
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

        {/* BOTTOM PANEL */}
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

      {/* Publish Dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="dark bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Publish Workflow</DialogTitle>
            <DialogDescription>
              Share this workflow as a reusable node in the marketplace.
              Only the structure and settings will be shared — not actual data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="pub-icon">Icon (emoji)</Label>
              <Input
                id="pub-icon"
                value={publishIcon}
                onChange={(e) => setPublishIcon(e.target.value)}
                placeholder="⚡"
                className="w-20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pub-name">Workflow Name *</Label>
              <Input
                id="pub-name"
                value={publishName}
                onChange={(e) => setPublishName(e.target.value)}
                placeholder="e.g. Attendance Calculator"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pub-desc">Description</Label>
              <Textarea
                id="pub-desc"
                value={publishDesc}
                onChange={(e) => setPublishDesc(e.target.value)}
                placeholder="What does this workflow do?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !publishName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
