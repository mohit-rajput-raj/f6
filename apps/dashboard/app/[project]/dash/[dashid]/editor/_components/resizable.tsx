import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/ui/resizable";
import React from "react";
import Flow from "./reactFlow";
import { TabsDemo } from "./tabs";
import { SheetDemo } from '@/components/dashboard/sheet'

export function WorkFlowEditor() {
  return (<>
     <div>
              <SheetDemo/>
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
          <ResizablePanel defaultSize={30} minSize={15} maxSize={60}>
            <div className="flex h-full w-full p-1 min-w-[250px]">
              <TabsDemo />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle />

      {/* BOTTOM PANEL */}
      <ResizablePanel defaultSize={30} minSize={10} maxSize={70}>
        <div className="flex h-full w-full p-1 min-w-[250px]">
          <TabsDemo />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </>
  );
}
