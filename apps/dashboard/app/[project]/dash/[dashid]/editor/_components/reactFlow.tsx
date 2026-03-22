"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Position,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowInstance,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { BaseNodeFullDemo } from "./nodes/base-node";
import { ActionBarNodeDemo } from "./nodes/BaseNode-action-bar";
import { ContextMenuDemo } from "./ContextMenu";
import { useUIStore } from "@/stores/ui.store";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
import { OutputNode } from "./nodes/output-node";
import { InputFileNode } from "./nodes/input-nodes/inputfile";
import { InputImage } from "./nodes/input-nodes/input-image";
import { InputText } from "./nodes/input-nodes/text-input";
import { usePathname } from "next/navigation";
import { EditorCanvasCardType } from "@/lib/types";
import { toast } from "sonner";
import { v4 } from "uuid";
import { EditorCanvasDefaultCardTypes } from "@/app/constants/nodes-desp";
import EditorCanvasCardSingle from "./nodes/input-nodes/canvas-card";
import { CamelCaseNode, TextInputNode } from "./nodes/input-nodes/test-nodes";
import { OutputNode2 } from "./nodes/output-nodes/textoutput";
import { LowercaseNode } from "./nodes/calcy-nodes/lowercase";
import { FilterNode } from "./nodes/calcy-nodes/filter-node";
// import { MathColumnNode } from "./nodes/calcy-nodes/math-column-node";
// import { MathRowNode } from "./nodes/calcy-nodes/math-row-node";
// import { SortNode } from "./nodes/calcy-nodes/sort-node";
// import { AggregateNode } from "./nodes/calcy-nodes/aggregate-node";
// import { FormulaNode } from "./nodes/calcy-nodes/formula-node";
// import { MergeNode } from "./nodes/calcy-nodes/merge-node";
// import { RenameColumnNode } from "./nodes/calcy-nodes/rename-column-node";
// import { SelectColumnsNode } from "./nodes/calcy-nodes/select-columns-node";
// import { FileOutputNode } from "./nodes/output-nodes/file-output-node";
import { debounce } from "./nodes/executions/functions";
import { AggregateNode } from "./nodes/calcy-nodes/aggregate-node";
import { FormulaNode } from "./nodes/calcy-nodes/formula-node";
import { MathColumnNode } from "./nodes/calcy-nodes/math-column-node";
import { MathRowNode } from "./nodes/calcy-nodes/math-row-node";
import { MergeNode } from "./nodes/calcy-nodes/merge-node";
import { RenameColumnNode } from "./nodes/calcy-nodes/rename-column-node";
import { SelectColumnsNode } from "./nodes/calcy-nodes/select-columns-node";
import { SortNode } from "./nodes/calcy-nodes/sort-node";
import { FileOutputNode } from "./nodes/output-nodes/file-output-node";
import { SpreadsheetInputNode } from "./nodes/input-nodes/spreadsheet-input-node";

const Flow = ({ handleRuns }: { handleRuns: () => void }) => {
  const nodeTypess = useMemo(
    () => ({
      // Input nodes
      InputFileNode: InputFileNode,
      InputImage: InputImage,
      InputText: InputText,
      TextInputNode: TextInputNode,
      SpreadsheetInputNode: SpreadsheetInputNode,

      // Transform nodes
      FilterNode: FilterNode,
      CamelCaseNode: CamelCaseNode,
      LowercaseNode: LowercaseNode,
      SortNode: SortNode,
      RenameColumnNode: RenameColumnNode,
      SelectColumnsNode: SelectColumnsNode,

      // Math nodes
      MathColumnNode: MathColumnNode,
      MathRowNode: MathRowNode,
      FormulaNode: FormulaNode,
      AggregateNode: AggregateNode,

      // Combine nodes
      MergeNode: MergeNode,

      // Output nodes
      OutputNode2: OutputNode2,
      FileOutputNode: FileOutputNode,
      baseOutput: OutputNode,

      // Legacy
      FilterCsvNode: EditorCanvasCardSingle,
      baseNodebar: ActionBarNodeDemo,
      baseNodeFull: BaseNodeFullDemo,
    }),
    []
  );

  const debouncedRun = debounce(handleRuns, 600);
  const { minimapOpen } = useUIStore();
  const { edges, nodes, setEdges, setNodes, pushHistory } =
    useEditorWorkFlow();
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance>();
  const pathname = usePathname();

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodesChange = useCallback(
    (changes: any) => {
      setNodes((oldNodes) => applyNodeChanges(changes, oldNodes));
    },
    [setNodes]
  );

  const onConnect = useCallback(
    (connection: any) => {
      pushHistory();
      setEdges((oldEdges) => addEdge(connection, oldEdges));
      debouncedRun();
    },
    [setEdges, pushHistory]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      setEdges((oldEdges) => applyEdgeChanges(changes, oldEdges));
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();

      const type: EditorCanvasCardType["type"] = event.dataTransfer.getData(
        "application/reactflow"
      );

      if (typeof type === "undefined" || !type) {
        return;
      }

      if (!reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      pushHistory();

      const newNode = {
        id: v4(),
        type,
        position,
        data: {
          title: type,
          description:
            EditorCanvasDefaultCardTypes[type]?.description ?? "",
          completed: false,
          current: false,
          metadata: {},
          type: type,
        },
      };
      //@ts-ignore
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, pushHistory]
  );

  const onNodeDragStop = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  return (
    <div className="w-full h-[100%]">
      <ContextMenuDemo>
        <ReactFlow
          edges={edges}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodes={nodes}
          nodeTypes={nodeTypess}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onNodeDragStop={onNodeDragStop}
          fitView
          minZoom={0.2}
          maxZoom={3}
        >
          <Background />
          <Controls className="dark:text-zinc-800" />
          {minimapOpen && <MiniMap />}
        </ReactFlow>
      </ContextMenuDemo>
    </div>
  );
};

export default Flow;
