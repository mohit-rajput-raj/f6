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
          <TabsTrigger value="onlineNodes">Imported Nodes</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <PanelSettings />
        </TabsContent>
        <TabsContent value="node">
          <ItemImage />
        </TabsContent>
        <TabsContent value="onlineNodes">
          <ItemImportedNodes />
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
import { ExtensionSheetDemo } from "@/components/dashboard/sheet"
import { useSession } from "@/lib/auth-client"
import { getInstalledWorkflows } from "../_actions/publish.service"

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
    ]
  }
]

const publishNodes = [
  {
    title: "Publish",
    types: [
      {
        title: "Workflow Input",
        type: "WorkflowInputNode",
        icon: <IconUpload />,
        description: "Define input boundary for publishing",
      },
      {
        title: "Workflow Output",
        type: "WorkflowOutputNode",
        icon: <IconDownload />,
        description: "Define output boundary (optional)",
      },
    ]
  }
]

const importedNodes = [
  {
    title: "Input",
    types: [

      {
        title: "Data Library",
        type: "DataLibraryInputNode",
        icon: <IconFile />,
        description: "Import from Data Library",
      },
    ]
  },
  {
    title: "Transform",
    types: [

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

    ]
  },
  {
    title: "Logic",
    types: [

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

      {/* Publish Boundary Nodes */}
      <Accordion type="multiple" defaultValue={["Publish"]} className="w-full mt-2">
        {publishNodes.map((group) => (
          <AccordionItem key={group.title} value={group.title}>
            <AccordionTrigger className="text-sm font-semibold text-indigo-400">
              📦 {group.title}
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
                    className="flex items-center gap-3 rounded-md border border-indigo-800/40 bg-indigo-950/20 p-2.5 text-left hover:bg-indigo-900/30 transition cursor-grab active:cursor-grabbing"
                  >
                    <span className="text-indigo-400">
                      {item.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
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
export function ItemImportedNodes() {
  const { setNodes, pushHistory } = useEditorWorkFlow();
  const [installedWorkflows, setInstalledWorkflows] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { data: session } = useSession();

  // Fetch installed workflows on mount
  React.useEffect(() => {
    const fetchInstalled = async () => {
      if (!session?.user?.id) return;
      setIsLoading(true);
      try {
        const installed = await getInstalledWorkflows(session.user.id);
        setInstalledWorkflows(installed);
      } catch (err) {
        console.error("Failed to fetch installed workflows:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstalled();
  }, [session?.user?.id]);

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

  // Add a SubflowNode with full published workflow data
  const onInstalledClick = (workflow: any) => {
    pushHistory();
    const pw = workflow.publishedWorkflow;
    setNodes((nodes) => [
      ...nodes,
      {
        id: crypto.randomUUID(),
        type: 'SubflowNode' as EditorCanvasTypes,
        position: {
          x: 200 + Math.random() * 100,
          y: 200 + Math.random() * 100,
        },
        data: {
          title: pw.name,
          description: pw.description || 'Installed workflow',
          completed: false,
          current: false,
          metadata: {},
          type: 'SubflowNode' as EditorCanvasTypes,
          publishedName: pw.name,
          publishedIcon: pw.icon || '⚡',
          publishedDefinition: pw.definition,
          inputSchema: pw.inputSchema,
          outputSchema: pw.outputSchema,
          config: {
            publishedWorkflowId: pw.id,
          },
        },
      },
    ]);
  };

  // Drag start for installed workflow nodes
  const onInstalledDragStart = (e: React.DragEvent, workflow: any) => {
    // We store metadata in a custom format so onDrop can create SubflowNode
    e.dataTransfer.setData("application/reactflow", "SubflowNode");
    e.dataTransfer.setData("application/subflow-data", JSON.stringify({
      publishedName: workflow.publishedWorkflow.name,
      publishedIcon: workflow.publishedWorkflow.icon || '⚡',
      publishedDefinition: workflow.publishedWorkflow.definition,
      inputSchema: workflow.publishedWorkflow.inputSchema,
      outputSchema: workflow.publishedWorkflow.outputSchema,
      publishedWorkflowId: workflow.publishedWorkflow.id,
    }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-full max-w-md px-1">
      <div className="flex items-center mb-2">
        <ExtensionSheetDemo>
          <Button variant={"outline"} className="w-full">Import Nodes  <IconFileImport /></Button>
        </ExtensionSheetDemo>
      </div>

      {/* Installed Workflows Section */}
      {isLoading && (
        <div className="text-xs text-muted-foreground text-center py-2 animate-pulse">
          Loading installed workflows...
        </div>
      )}

      {installedWorkflows.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Installed Workflows ({installedWorkflows.length})
          </h4>
          <div className="flex flex-col gap-2">
            {installedWorkflows.map((iw) => (
              <button
                key={iw.id}
                onClick={() => onInstalledClick(iw)}
                draggable
                onDragStart={(e) => onInstalledDragStart(e, iw)}
                className="flex items-center gap-3 rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-grab active:cursor-grabbing"
              >
                <span className="text-lg flex-shrink-0">
                  {iw.publishedWorkflow?.icon || '⚡'}
                </span>

                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">
                    {iw.publishedWorkflow?.name || 'Workflow'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {iw.publishedWorkflow?.description || 'Published workflow'}
                  </span>
                  <span className="text-[10px] text-indigo-500 mt-0.5">
                    by {iw.publishedWorkflow?.publisher?.name || 'Unknown'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Standard imported nodes */}
      <Accordion type="multiple" defaultValue={["Input", "Transform", "Math", "Combine", "Output"]} className="w-full">
        {importedNodes.map((group) => (
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

