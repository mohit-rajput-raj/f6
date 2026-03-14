'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs"


import FileTreeDemo from "@/components/files/fele-tree"
import 'react-folder-tree/dist/style.css';
import { useCallback, useState } from "react"
export function TabsDemo() {
  return (
    <div className="flex w-full h-full flex-col gap-6 ">
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Editor Settings</TabsTrigger>
          <TabsTrigger value="node">nodes</TabsTrigger>
          <TabsTrigger value="nodes">nodes</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <PanelSettings />
        </TabsContent>
        <TabsContent value="node">
          <ItemImage />
        </TabsContent>
        <TabsContent value="nodes">
          <TabsNodesOnly />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function TabsNodesOnly() {
  const { setNodes } = useEditorWorkFlow();

  const onItemClick = (type: string) => {
    setNodes((nodes) => [
      ...nodes,
      {
        id: crypto.randomUUID(),
        type: type as EditorCanvasTypes,
        position: {
          x: 200 + Math.random() * 100,
          y: 200 + Math.random() * 100,
        },
        data: {
          title: type,
          description: '',
          completed: false,
          current: false,
          metadata: {},
          type: type as EditorCanvasTypes,
        },
      },
    ]);
  };
  return (
    <div className="flex w-full h-full flex-col gap-6 ">
      <Tabs defaultValue="input">
        <TabsList>
          <TabsTrigger value="Input">Input</TabsTrigger>
          <TabsTrigger value="Process">Process</TabsTrigger>
          <TabsTrigger value="Output">Output</TabsTrigger>
        </TabsList>
        {
          nodes.map((group) => (
            <TabsContent value={group.title} key={group.title}>
              <div className="flex flex-col gap-3">
                {group.types.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onItemClick(item.type)}
                    className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-muted transition"
                  >
                    <span className="text-muted-foreground">
                      {item.icon}
                    </span>

                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>
          ))
        }


      </Tabs>
    </div>
  )
}
import Image from "next/image"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@repo/ui/components/ui/item"
import { PanelSettings } from "./panel-settings";
import { Node, useReactFlow } from "@xyflow/react";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import React from "react";
import { nodeTypes } from "./reactFlow";
import { IconCalculator, IconFile, IconPencil, IconTextCaption } from "@tabler/icons-react";
import { description } from "@/components/nav/chart-area-interactive";
import { EditorCanvasTypes } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/ui/accordion";
import { TabsBottom } from "./tabsBottom";

const nodes = [
  {
    title: "Input",
    types: [
      {
        title: "File",
        type: "InputFileNode",
        icon: <IconFile />,
        description: "add file",
      },
      {
        title: "Text",
        type: "InputText",
        icon: <IconPencil />,
        description: "add text",
      },
      {
        title: "Image",
        type: "InputImage",
        icon: <IconPencil />,
        description: "add image",
      },
      {
        title: "Text",
        type: "TextInputNode",
        icon: <IconPencil />,
        description: "add text",
      }
    ]


  },
  {
    title: "Process",
    types: [
      {
        title: "File",
        type: "baseNodebar",
        icon: <IconFile />,
        description: "add file",
      },
      {
        title: "Text",
        type: "CamelCaseNode",
        icon: <IconPencil />,
        description: "add text",
      }, {
        title: "Calculation",
        type: "FilterNode",
        icon: <IconCalculator />,
        description: "add text",
      },
      {
        title: "LowercaseNode",
        type: "LowercaseNode",
        icon: <IconPencil />,
        description: "add text",
      }
    ]
  },
  {
    title: "Output",
    types: [
      {
        title: "File",
        type: "baseOutput",
        icon: <IconFile />,
        description: "add file",
      },
      {
        title: "Text",
        type: "baseOutput",
        icon: <IconPencil />,
        description: "add text",
      },
      {
        title: "Text",
        type: "OutputNode2",
        icon: <IconTextCaption />,
        description: "add text",
      }
    ]
  }

]





export function ItemImage() {
  const { setNodes } = useEditorWorkFlow();

  const onItemClick = (type: string) => {
    setNodes((nodes) => [
      ...nodes,
      {
        id: crypto.randomUUID(),
        type: type as EditorCanvasTypes,
        position: {
          x: 200 + Math.random() * 100,
          y: 200 + Math.random() * 100,
        },
        data: {
          title: type,
          description: '',
          completed: false,
          current: false,
          metadata: {},
          type: type as EditorCanvasTypes,
        },
      },
    ]);
  };

  return (
    <div className="w-full max-w-md px-1">
      <Accordion type="multiple" className="w-full">
        {nodes.map((group) => (
          <AccordionItem
            key={group.title}
            value={group.title}
          >
            <AccordionTrigger className="text-sm font-semibold">
              {group.title}
            </AccordionTrigger>

            <AccordionContent>
              <div className="flex flex-col gap-3">
                {group.types.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onItemClick(item.type)}
                    className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-muted transition"
                  >
                    <span className="text-muted-foreground">
                      {item.icon}
                    </span>

                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}


