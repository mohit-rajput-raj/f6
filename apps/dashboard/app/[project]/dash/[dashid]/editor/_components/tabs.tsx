'use client'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs"


import FileTreeDemo from "@/components/files/fele-tree"
// import 'react-folder-tree/dist/style.css';
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
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", item.type);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center gap-3 rounded-md border p-3 text-left hover:bg-muted transition cursor-grab active:cursor-grabbing"
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

import { PanelSettings } from "./panel-settings";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import React from "react";
import {
  IconArrowsSort,
  IconCalculator,
  IconChartBar,
  IconColumns3,
  IconColumnRemove,
  IconFile,
  IconFileExport,
  IconFileText,
  IconFilter,
  IconGitMerge,
  IconGitBranch,
  IconGitFork,
  IconMathFunction,
  IconPencil,
  IconRowInsertBottom,
  IconTextCaption,
  IconTransform,
  IconTypography,
  IconFileImport,
  IconUpload,
  IconDownload,
  IconLayoutColumns,
  IconTable,
  IconEye,
  IconForms,
  IconTableImport,
  IconDatabase,
  IconSparkles,
} from "@tabler/icons-react";
import { EditorCanvasTypes } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/ui/accordion";
import { TabsBottom } from "./tabsBottom";
import { Button } from "@/components/ui/components"
import { useSession } from "@/lib/auth-client"

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
      {
        title: "Data Library",
        type: "DataLibraryInputNode",
        icon: <IconFile />,
        description: "Import from Data Library",
      },
      {
        title: "Text Value",
        type: "TextValueNode",
        icon: <IconTypography />,
        description: "Single text value (e.g. subject code)",
      },
      {
        title: "Number Value",
        type: "NumberValueNode",
        icon: <IconCalculator />,
        description: "Single number value",
      },
      {
        title: "Desk Text Input",
        type: "DeskTextInputNode",
        icon: <IconForms />,
        description: "Text from Desk panel input",
      },
      {
        title: "Desk Sheet",
        type: "DeskSheetNode",
        icon: <IconTableImport />,
        description: "Sheet data from Desk panel",
      },
      {
        title: "MasterSheet Library",
        type: "MasterSheetLibraryNode",
        icon: <IconDatabase />,
        description: "Load existing MasterSheet from library",
      },
      {
        title: "Action Button",
        type: "ActionButtonNode",
        icon: <IconForms />,
        description: "Button for Desk MasterSheet panel",
      },
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
      {
        title: "Column Map",
        type: "ColumnMapNode",
        icon: <IconTransform />,
        description: "Rename/remap columns",
      },
      {
        title: "Drop Columns",
        type: "DropColumnNode",
        icon: <IconColumnRemove />,
        description: "Remove specific columns",
      },
      {
        title: "AI Schema Align",
        type: "AISchemaAlignNode",
        icon: <IconSparkles />,
        description: "AI-assisted schema alignment & row matching",
      },
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
      {
        title: "Count Value",
        type: "CountNode",
        icon: <IconCalculator />,
        description: "Count specific value in rows",
      },
    ]
  },
  {
    title: "Logic",
    types: [
      {
        title: "If / Else",
        type: "IfElseNode",
        icon: <IconGitBranch />,
        description: "Route rows based on conditions",
      },
      {
        title: "Switch Case",
        type: "SwitchCaseNode",
        icon: <IconGitFork />,
        description: "Route by exact column value",
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
        description: "Join two datasets (SQL-style)",
      },
      {
        title: "Union Merge",
        type: "UnionMergeNode",
        icon: <IconGitMerge />,
        description: "Combine all cols from multiple sheets",
      },
      {
        title: "Update Merge",
        type: "UpdateMergeNode",
        icon: <IconGitMerge />,
        description: "Accumulate values (e.g. totals)",
      },
      {
        title: "Sheet Merge",
        type: "SheetMergeNode",
        icon: <IconGitMerge />,
        description: "Side-by-side with prefixes",
      },
      {
        title: "Append / Stack",
        type: "AppendNode",
        icon: <IconRowInsertBottom />,
        description: "Stack datasets vertically",
      },
      {
        title: "Subject Block",
        type: "SubjectBlockNode",
        icon: <IconTable />,
        description: "Map data with subject/section prefix",
      },
      {
        title: "Block Concat",
        type: "BlockConcatNode",
        icon: <IconLayoutColumns />,
        description: "Join blocks into master sheet",
      },
      {
        title: "Dynamic Block Concat",
        type: "DynamicBlockConcatNode",
        icon: <IconDatabase />,
        description: "Code-driven block merge into MasterSheet",
      },
      {
        title: "Block Extractor",
        type: "BlockExtractorNode",
        icon: <IconLayoutColumns />,
        description: "Extract block by code",
      },
    ]
  },
  {
    title: "Output",
    types: [
      {
        title: "File Output",
        type: "FileOutputNode",
        icon: <IconFileExport />,
        description: "Export as CSV file",
      },
      {
        title: "Sheet Editor",
        type: "SheetEditorNode",
        icon: <IconPencil />,
        description: "Push data to a target sheet",
      },
      {
        title: "Output Preview",
        type: "OutputPreviewNode",
        icon: <IconEye />,
        description: "Preview output in Desk panel",
      },
      {
        title: "Master Sheet Preview",
        type: "MasterSheetPreviewNode",
        icon: <IconTable />,
        description: "Show data in bottom MasterSheet (with ID)",
      },
      {
        title: "Master Sheet Update",
        type: "MasterSheetUpdateNode",
        icon: <IconDatabase />,
        description: "Save / sync output to MasterSheet",
      },
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
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/reactflow", item.type);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex items-center gap-3 rounded-md border p-2.5 text-left hover:bg-muted transition cursor-grab active:cursor-grabbing"
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

