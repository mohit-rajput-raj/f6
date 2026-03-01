"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/ui/resizable";
import Flow from "./reactFlow";
import { TabsDemo } from "./tabs";
import { SheetDemo } from "@/components/dashboard/sheet";
import { useUIStore } from "@/stores/ui.store";
import { Button } from "@repo/ui/components/ui/button";
import { IconDirectionHorizontal } from "@tabler/icons-react";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import { useSession } from "@/lib/auth-client";
import { usegetWorkFlow } from "../_actions/editor.queryes";
import { useParams } from "next/navigation";
import { executeWorkflow } from "./nodes/executions/nodeExecutions";
import { useEdgesState, useNodesState } from "@xyflow/react";
import React from "react";
export function WorkFlowEditor() {
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
  

  const { data: s, isLoading } = usegetWorkFlow(flowId);
  const { setSidebarOpen, sidebarOpen, bottombarOpen, setBottombarOpen } = useUIStore();
  const { data: session, isPending } = useSession();
 const {edges,nodes,setEdges,setNodes , state , dispatch, handleRun}=useEditorWorkFlow()
   const [isRunning, setIsRunning] = React.useState(false);
  if (isLoading || isPending) {
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

  const userId = session?.user?.id;
    const id = session?.user?.id
 
  return (
    <>
      <div className="flex justify-between">
        <div className="flex gap-1">
          <SheetDemo />
        <Button onClick={handleRun}>
          Fetch
        </Button>
        <Button onClick={handleRuns}>
          Execute
        </Button>
        <Button onClick={() => dispatch({ type: "UNDO" })}>
          undo
        </Button>
        <Button onClick={() => dispatch({ type: "REDO" })}>
          redo
        </Button>
         
        </div>
        <div>
          <Button variant={"ghost"} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <IconDirectionHorizontal />
        </Button>
        <Button variant={"ghost"} onClick={() => setBottombarOpen(!bottombarOpen)}>
          <IconDirectionHorizontal className="rotate-z-90" />
        </Button>
        </div>
      </div>
      <ResizablePanelGroup
        direction="vertical"
        className="min-h-[200px] w-full rounded-lg border md:min-w-[450px]"
      >
        {/* TOP SECTION */}
        <ResizablePanel defaultSize={70} minSize={40} maxSize={90}>
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full w-full rounded-lg border"
          >
            {/* LEFT PANEL */}
            <ResizablePanel defaultSize={70} minSize={40} maxSize={85}>
              <div className="flex h-full w-full items-center justify-center">
                <Flow />
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* RIGHT PANEL */}
            <ResizablePanel
              defaultSize={30}
              minSize={15}
              maxSize={60}
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
        <ResizablePanel defaultSize={30} minSize={10} maxSize={70} className={`${bottombarOpen ? "hidden" : ""}`}>
          <div className="flex h-full w-full p-1 min-w-[250px]">
            {/* <TabsDemo /> */}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
