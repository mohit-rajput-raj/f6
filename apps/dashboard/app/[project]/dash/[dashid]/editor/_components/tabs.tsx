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
      <Tabs defaultValue="node">
        <TabsList>
          <TabsTrigger value="account">Settings</TabsTrigger>
          <TabsTrigger value="node">Nodes</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <PanelSettings />
        </TabsContent>
        <TabsContent value="node">
          <ItemImage />
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
      <Tabs defaultValue="Input">
        <TabsList>
          <TabsTrigger value="Input">Input</TabsTrigger>
          <TabsTrigger value="Transform">Transform</TabsTrigger>
          <TabsTrigger value="Math">Math</TabsTrigger>
          <TabsTrigger value="Combine">Combine</TabsTrigger>
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
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import React from "react";
import {
  IconArrowsSort,
  IconCalculator,
  IconChartBar,
  IconColumns3,
  IconFile,
  IconFileExport,
  IconFileText,
  IconFilter,
  IconGitMerge,
  IconMathFunction,
  IconPencil,
  IconRowInsertBottom,
  IconTextCaption,
  IconTransform,
  IconTypography,
} from "@tabler/icons-react";
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
        title: "File Input",
        type: "InputFileNode",
        icon: <IconFile />,
        description: "Upload .xlsx/.csv file",
      },
      // {
      //   title: "Text Input",
      //   type: "TextInputNode",
      //   icon: <IconPencil />,
      //   description: "Enter text data",
      // },
    ]
  },
  {
    title: "Transform",
    types: [
      {
        title: "Filter",
        type: "FilterNode",
        icon: <IconFilter />,
        description: "Filter rows by condition",
      },
      {
        title: "Sort",
        type: "SortNode",
        icon: <IconArrowsSort />,
        description: "Sort by column",
      },
      {
        title: "Rename Column",
        type: "RenameColumnNode",
        icon: <IconTypography />,
        description: "Rename a column",
      },
      {
        title: "Select Columns",
        type: "SelectColumnsNode",
        icon: <IconColumns3 />,
        description: "Pick or drop columns",
      },
      // {
      //   title: "Uppercase",
      //   type: "CamelCaseNode",
      //   icon: <IconTransform />,
      //   description: "Convert to camelCase",
      // },
      // {
      //   title: "Lowercase",
      //   type: "LowercaseNode",
      //   icon: <IconTransform />,
      //   description: "Convert to lowercase",
      // },
    ]
  },
  {
    title: "Math",
    types: [
      {
        title: "Math (Column)",
        type: "MathColumnNode",
        icon: <IconCalculator />,
        description: "Add/Sub/Mul/Div on column",
      },
      {
        title: "Math (Row)",
        type: "MathRowNode",
        icon: <IconRowInsertBottom />,
        description: "Sum/Avg/Min/Max across rows",
      },
      {
        title: "Formula",
        type: "FormulaNode",
        icon: <IconMathFunction />,
        description: "Custom formula expression",
      },
      {
        title: "Aggregate",
        type: "AggregateNode",
        icon: <IconChartBar />,
        description: "Group by + aggregate",
      },
    ]
  },
  {
    title: "Combine",
    types: [
      {
        title: "Merge / Join",
        type: "MergeNode",
        icon: <IconGitMerge />,
        description: "Join two datasets",
      },
    ]
  },
  {
    title: "Output",
    types: [
      // {
      //   title: "Text Output",
      //   type: "OutputNode2",
      //   icon: <IconTextCaption />,
      //   description: "Display text/data result",
      // },
      {
        title: "File Output",
        type: "FileOutputNode",
        icon: <IconFileExport />,
        description: "Export as CSV file",
      },
      // {
      //   title: "Output Display",
      //   type: "baseOutput",
      //   icon: <IconFileText />,
      //   description: "Basic output display",
      // },
    ]
  }
]



export function ItemImage() {
  const { setNodes, pushHistory } = useEditorWorkFlow();

  const onItemClick = (type: string) => {
    pushHistory();
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
      <Accordion type="multiple" defaultValue={["Input", "Transform", "Math", "Combine", "Output"]} className="w-full">
        {nodes.map((group) => (
          <AccordionItem
            key={group.title}
            value={group.title}
          >
            <AccordionTrigger className="text-sm font-semibold">
              {group.title}
            </AccordionTrigger>

            <AccordionContent>
              <div className="flex flex-col gap-2">
                {group.types.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onItemClick(item.type)}
                    className="flex items-center gap-3 rounded-md border p-2.5 text-left hover:bg-muted transition"
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


