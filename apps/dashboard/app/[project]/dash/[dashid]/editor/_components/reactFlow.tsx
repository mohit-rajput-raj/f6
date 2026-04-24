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
import { CountNode } from "./nodes/calcy-nodes/count-node";
import { UpdateMergeNode } from "./nodes/calcy-nodes/update-merge-node";
import { SheetMergeNode } from "./nodes/calcy-nodes/sheet-merge-node";
import { AppendNode } from "./nodes/calcy-nodes/append-node";
import { ColumnMapNode } from "./nodes/calcy-nodes/column-map-node";
import { DataLibraryInputNode } from "./nodes/input-nodes/data-library-input-node";
import { UnionMergeNode } from "./nodes/calcy-nodes/union-merge-node";
import { DropColumnNode } from "./nodes/calcy-nodes/drop-column-node";
import { IfElseNode } from "./nodes/calcy-nodes/if-else-node";
import { SwitchCaseNode } from "./nodes/calcy-nodes/switch-case-node";
import { SubflowNode } from "./nodes/calcy-nodes/subflow-node";
import { SheetEditorNode } from "./nodes/output-nodes/sheet-editor-node";
import { WorkflowInputNode } from "./nodes/calcy-nodes/workflow-input-node";
import { WorkflowOutputNode } from "./nodes/calcy-nodes/workflow-output-node";
import { SubjectBlockNode } from "./nodes/calcy-nodes/subject-block-node";
import { BlockConcatNode } from "./nodes/calcy-nodes/block-concat-node";
import { TextValueNode } from "./nodes/input-nodes/text-value-node";
import { NumberValueNode } from "./nodes/input-nodes/number-value-node";
import { DeskTextInputNode } from "./nodes/input-nodes/desk-text-input-node";
import { DeskSheetNode } from "./nodes/input-nodes/desk-sheet-node";
import { OutputPreviewNode } from "./nodes/output-nodes/output-preview-node";
import { TrueFalseNode } from "./nodes/input-nodes/true-false-node";
import { BlockOutputSenderNode } from "./nodes/output-nodes/block-output-sender-node";
import { MasterSheetPreviewNode } from "./nodes/output-nodes/mastersheet-preview-node";
import { MasterSheetLibraryNode } from "./nodes/input-nodes/mastersheet-library-node";
import { DynamicBlockConcatNode } from "./nodes/calcy-nodes/dynamic-block-concat-node";
import { BlockExtractorNode } from "./nodes/calcy-nodes/block-extractor-node";
import { ActionButtonNode } from "./nodes/input-nodes/action-button-node";

const Flow = ({ handleRuns }: { handleRuns: () => void }) => {
  const nodeTypess = useMemo(
    () => ({
    
      InputFileNode: InputFileNode,
      InputImage: InputImage,
      InputText: InputText,
      TextInputNode: TextInputNode,
      SpreadsheetInputNode: SpreadsheetInputNode,
      DataLibraryInputNode: DataLibraryInputNode,

    
      FilterNode: FilterNode,
      CamelCaseNode: CamelCaseNode,
      LowercaseNode: LowercaseNode,
      SortNode: SortNode,
      RenameColumnNode: RenameColumnNode,
      SelectColumnsNode: SelectColumnsNode,
      DropColumnNode: DropColumnNode,

 
      IfElseNode: IfElseNode,
      SwitchCaseNode: SwitchCaseNode,


      MathColumnNode: MathColumnNode,
      MathRowNode: MathRowNode,
      FormulaNode: FormulaNode,
      AggregateNode: AggregateNode,
      CountNode: CountNode,

 
      MergeNode: MergeNode,
      UpdateMergeNode: UpdateMergeNode,
      SheetMergeNode: SheetMergeNode,
      AppendNode: AppendNode,
      ColumnMapNode: ColumnMapNode,
      UnionMergeNode: UnionMergeNode,

 
      OutputNode2: OutputNode2,
      FileOutputNode: FileOutputNode,
      baseOutput: OutputNode,

     
      FilterCsvNode: EditorCanvasCardSingle,
      baseNodebar: ActionBarNodeDemo,
      baseNodeFull: BaseNodeFullDemo,

      // Published workflow node
      SubflowNode: SubflowNode,

      // Sheet editor node (no output)
      SheetEditorNode: SheetEditorNode,

      // Publish boundary nodes
      WorkflowInputNode: WorkflowInputNode,
      WorkflowOutputNode: WorkflowOutputNode,

      // Master sheet nodes
      SubjectBlockNode: SubjectBlockNode,
      BlockConcatNode: BlockConcatNode,

      // Value input nodes
      TextValueNode: TextValueNode,
      NumberValueNode: NumberValueNode,

      // Desk panel nodes
      DeskTextInputNode: DeskTextInputNode,
      DeskSheetNode: DeskSheetNode,
      OutputPreviewNode: OutputPreviewNode,
      TrueFalseNode: TrueFalseNode,
      BlockOutputSenderNode: BlockOutputSenderNode,
      MasterSheetPreviewNode: MasterSheetPreviewNode,
      MasterSheetLibraryNode: MasterSheetLibraryNode,
      DynamicBlockConcatNode: DynamicBlockConcatNode,
      BlockExtractorNode: BlockExtractorNode,
      ActionButtonNode: ActionButtonNode,
    }),
    []
  );

  const debouncedRun = debounce(handleRuns, 600);
  const { minimapOpen, setSelectedNodeId } = useUIStore();
  const { edges, nodes, setEdges, setNodes, pushHistory, deskBlockId } =
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

      // Check for subflow metadata (when dragging installed workflows)
      let extraData: any = {};
      if (type === "SubflowNode") {
        try {
          const subflowRaw = event.dataTransfer.getData("application/subflow-data");
          if (subflowRaw) {
            const subflowData = JSON.parse(subflowRaw);
            extraData = {
              publishedName: subflowData.publishedName,
              publishedIcon: subflowData.publishedIcon,
              publishedDefinition: subflowData.publishedDefinition,
              inputSchema: subflowData.inputSchema,
              outputSchema: subflowData.outputSchema,
              config: { publishedWorkflowId: subflowData.publishedWorkflowId },
            };
          }
        } catch {}
      }

      // Auto-inject deskBlockId for desk-type nodes
      const deskNodeTypes = ["DeskTextInputNode", "DeskSheetNode", "OutputPreviewNode", "TrueFalseNode", "BlockOutputSenderNode", "MasterSheetPreviewNode"];
      if (deskBlockId && deskNodeTypes.includes(type)) {
        extraData.deskBlockId = deskBlockId;
      }

      const newNode = {
        id: v4(),
        type,
        position,
        data: {
          title: extraData.publishedName || type,
          description:
            EditorCanvasDefaultCardTypes[type]?.description ?? "",
          completed: false,
          current: false,
          metadata: {},
          type: type,
          ...extraData,
        },
      };
      //@ts-ignore
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, pushHistory, deskBlockId]
  );

  const onNodeDragStop = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const onNodeClick = useCallback((_event: any, node: any) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

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
          onNodeClick={onNodeClick}
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
