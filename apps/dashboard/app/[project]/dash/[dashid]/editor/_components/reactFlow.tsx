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
import { useWorkflowEditorStore } from "@/stores/workflow-editor-store";
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
// import { CamelCaseNode, TextInputNode } from "./nodes/input-nodes/test-nodes";
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
import { TabInputNode } from "./nodes/input-nodes/tab-input-node";
import { OutputPreviewNode } from "./nodes/output-nodes/output-preview-node";
import { TrueFalseNode } from "./nodes/input-nodes/true-false-node";
import { BlockOutputSenderNode } from "./nodes/output-nodes/block-output-sender-node";
import { MasterSheetPreviewNode } from "./nodes/output-nodes/mastersheet-preview-node";
import { MasterSheetLibraryNode } from "./nodes/input-nodes/mastersheet-library-node";
import { DynamicBlockConcatNode } from "./nodes/calcy-nodes/dynamic-block-concat-node";
import { BlockExtractorNode } from "./nodes/calcy-nodes/block-extractor-node";
import { ActionButtonNode } from "./nodes/input-nodes/action-button-node";
import { AISchemaAlignNode } from "./nodes/calcy-nodes/ai-schema-align-node";
import { DynamicMasterSheetNode } from "./nodes/calcy-nodes/dynamic-mastersheet-node";
import { UpdatedMergedPreviewNode } from "./nodes/output-nodes/updated-merged-preview-node";
import { AnalyticsStackNode } from "./nodes/output-nodes/analytics-stack-node";
import { SaveFileNode } from "./nodes/output-nodes/save-file-node";
import { GetFileNode } from "./nodes/input-nodes/get-file-node";

/**
 * Compares two string arrays for equality by value.
 */
function arraysEqual(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Extract column names from any source node (loaded dataset, executed result, or preset columns).
 */
export function resolveColumnsFromNode(node: any): string[] | null {
  if (!node || !node.data) return null;
  const { data } = node;

  // 1. Result columns (from executed node or GetFileNode)
  if (data.result && Array.isArray(data.result.columns) && data.result.columns.length > 0) {
    return data.result.columns;
  }

  // 2. Direct columns array on data (e.g. GetFileNode or preset)
  if (Array.isArray(data.columns) && data.columns.length > 0) {
    return data.columns;
  }

  // 3. Text columns (InputFileNode, SpreadsheetInputNode, DataLibraryInputNode, GetFileNode)
  if (data.text) {
    if (Array.isArray(data.text.columns) && data.text.columns.length > 0) {
      return data.text.columns;
    }
    if (typeof data.text === "object" && Array.isArray(data.text?.columns)) {
      return data.text.columns;
    }
    if (typeof data.text === "string") {
      try {
        const parsed = JSON.parse(data.text);
        if (parsed && Array.isArray(parsed.columns) && parsed.columns.length > 0) {
          return parsed.columns;
        }
      } catch {}
    }
  }

  // 4. inputColumns already set on the node (e.g. from an upstream node)
  if (Array.isArray(data.inputColumns) && data.inputColumns.length > 0) {
    return data.inputColumns;
  }

  // 5. Multi-input nodes with combined left/right columns
  if (Array.isArray(data.leftColumns) || Array.isArray(data.rightColumns)) {
    const combined = [...new Set([...(data.leftColumns || []), ...(data.rightColumns || [])])];
    if (combined.length > 0) return combined;
  }

  return null;
}

const Flow = ({ handleRuns }: { handleRuns?: () => void } = {}) => {
  const nodeTypess = useMemo(
    () => ({
    
      InputFileNode: InputFileNode,
      InputImage: InputImage,
      InputText: InputText,
      // TextInputNode: TextInputNode,
      SpreadsheetInputNode: SpreadsheetInputNode,
      DataLibraryInputNode: DataLibraryInputNode,

    
      FilterNode: FilterNode,
      // CamelCaseNode: CamelCaseNode,
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
      TabInputNode: TabInputNode,
      OutputPreviewNode: OutputPreviewNode,
      TrueFalseNode: TrueFalseNode,
      BlockOutputSenderNode: BlockOutputSenderNode,
      MasterSheetPreviewNode: MasterSheetPreviewNode,
      MasterSheetLibraryNode: MasterSheetLibraryNode,
      DynamicBlockConcatNode: DynamicBlockConcatNode,
      BlockExtractorNode: BlockExtractorNode,
      ActionButtonNode: ActionButtonNode,

      // AI & MasterSheet updates
      AISchemaAlignNode: AISchemaAlignNode,
      DynamicMasterSheetNode: DynamicMasterSheetNode,
      UpdatedMergedPreviewNode: UpdatedMergedPreviewNode,
      AnalyticsStackNode: AnalyticsStackNode,

      // Files system nodes
      SaveFileNode: SaveFileNode,
      GetFileNode: GetFileNode,
    }),
    []
  );

  const { minimapOpen, setSelectedNodeId } = useUIStore();
  const { edges, nodes, setEdges, setNodes, pushHistory, deskBlockId, isReadOnly, workflowId } =
    useEditorWorkFlow();
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance>();
  const pathname = usePathname();

  const cachedViewport = useWorkflowEditorStore(
    useCallback(
      (s) => (workflowId ? s.workflows[workflowId]?.viewport : undefined),
      [workflowId]
    )
  );
  const setStoreViewport = useWorkflowEditorStore((s) => s.setViewport);

  const onMoveEnd = useCallback(
    (_event: any, viewport: any) => {
      if (workflowId && viewport) {
        setStoreViewport(workflowId, viewport);
      }
    },
    [workflowId, setStoreViewport]
  );

  // Auto-fit view when nodes become available if no prior viewport exists
  const prevCountRef = React.useRef(nodes.length);
  useEffect(() => {
    if (prevCountRef.current === 0 && nodes.length > 0 && reactFlowInstance && !cachedViewport) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 50);
    }
    prevCountRef.current = nodes.length;
  }, [nodes.length, reactFlowInstance, cachedViewport]);

  const onDragOver = useCallback((event: any) => {
    if (isReadOnly) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, [isReadOnly]);

  const onNodesChange = useCallback(
    (changes: any) => {
      if (isReadOnly) {
        // Allow only selection changes for viewers, block position/remove/add
        const allowed = changes.filter((c: any) => c.type === "select" || c.type === "dimensions");
        if (allowed.length > 0) {
          setNodes((oldNodes) => applyNodeChanges(allowed, oldNodes));
        }
        return;
      }
      setNodes((oldNodes) => applyNodeChanges(changes, oldNodes));
    },
    [setNodes, isReadOnly]
  );

  const onConnect = useCallback(
    (connection: any) => {
      if (isReadOnly) return;
      pushHistory();
      setEdges((oldEdges) => addEdge(connection, oldEdges));

      // Auto-propagate columns to target node without executing or burning tokens
      setNodes((oldNodes) => {
        const sourceNode = oldNodes.find((n) => n.id === connection.source);
        if (!sourceNode) return oldNodes;

        const columns = resolveColumnsFromNode(sourceNode);
        if (!columns || columns.length === 0) return oldNodes;

        return oldNodes.map((n) => {
          if (n.id !== connection.target) return n;

          const targetHandle = connection.targetHandle;
          const isMultiInput = [
            "MergeNode",
            "UpdateMergeNode",
            "SheetMergeNode",
            "UnionMergeNode",
            "AppendNode",
          ].includes(n.type || "");

          if (
            targetHandle === "left" ||
            (isMultiInput && (!targetHandle || targetHandle === "in") && (!n.data?.leftColumns || n.data.leftColumns.length === 0))
          ) {
            return {
              ...n,
              data: {
                ...n.data,
                leftColumns: columns,
              },
            };
          } else if (
            targetHandle === "right" ||
            (isMultiInput && targetHandle !== "left" && n.data?.leftColumns?.length > 0 && (!n.data?.rightColumns || n.data.rightColumns.length === 0))
          ) {
            return {
              ...n,
              data: {
                ...n.data,
                rightColumns: columns,
              },
            };
          } else {
            return {
              ...n,
              data: {
                ...n.data,
                inputColumns: columns,
              },
            };
          }
        });
      });
    },
    [setEdges, setNodes, pushHistory, isReadOnly]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      if (isReadOnly) {
        const allowed = changes.filter((c: any) => c.type === "select");
        if (allowed.length > 0) {
          setEdges((oldEdges) => applyEdgeChanges(allowed, oldEdges));
        }
        return;
      }

      // Check for removed edges to clean up propagated columns if no other edge feeds that input
      const removeChanges = changes.filter((c: any) => c.type === "remove");
      if (removeChanges.length > 0) {
        const removedIds = new Set(removeChanges.map((c: any) => c.id));
        const remainingEdges = edges.filter((e) => !removedIds.has(e.id));
        const removedEdgesList = edges.filter((e) => removedIds.has(e.id));

        setNodes((oldNodes) =>
          oldNodes.map((node) => {
            const affectedEdges = removedEdgesList.filter((e) => e.target === node.id);
            if (affectedEdges.length === 0) return node;

            let updatedData = { ...node.data };
            let modified = false;

            for (const edge of affectedEdges) {
              if (edge.targetHandle === "left") {
                const stillHasLeft = remainingEdges.some(
                  (e) => e.target === node.id && e.targetHandle === "left"
                );
                if (!stillHasLeft && updatedData.leftColumns?.length > 0) {
                  updatedData.leftColumns = [];
                  modified = true;
                }
              } else if (edge.targetHandle === "right") {
                const stillHasRight = remainingEdges.some(
                  (e) => e.target === node.id && e.targetHandle === "right"
                );
                if (!stillHasRight && updatedData.rightColumns?.length > 0) {
                  updatedData.rightColumns = [];
                  modified = true;
                }
              } else {
                const stillHasIncoming = remainingEdges.some((e) => e.target === node.id);
                if (!stillHasIncoming && updatedData.inputColumns?.length > 0) {
                  if (!node.data?.text?.columns && !node.data?.columns) {
                    updatedData.inputColumns = [];
                    modified = true;
                  }
                }
              }
            }

            return modified ? { ...node, data: updatedData } : node;
          })
        );
      }

      setEdges((oldEdges) => applyEdgeChanges(changes, oldEdges));
    },
    [setEdges, setNodes, edges, isReadOnly]
  );

  // Reactive column sync: if an edge exists and source node's data/columns become available
  // (e.g. user selected or uploaded a file after connecting the edge, or chained nodes)
  useEffect(() => {
    if (isReadOnly || edges.length === 0 || nodes.length === 0) return;

    let hasChanges = false;
    const updatedNodes = nodes.map((targetNode) => {
      const incomingEdges = edges.filter((e) => e.target === targetNode.id);
      if (incomingEdges.length === 0) return targetNode;

      let nodeChanged = false;
      let newLeftCols = targetNode.data?.leftColumns;
      let newRightCols = targetNode.data?.rightColumns;
      let newInputCols = targetNode.data?.inputColumns;

      const isMultiInput = [
        "MergeNode",
        "UpdateMergeNode",
        "SheetMergeNode",
        "UnionMergeNode",
        "AppendNode",
      ].includes(targetNode.type || "");

      for (const edge of incomingEdges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;
        const cols = resolveColumnsFromNode(sourceNode);
        if (!cols || cols.length === 0) continue;

        if (edge.targetHandle === "left") {
          if (!arraysEqual(newLeftCols, cols)) {
            newLeftCols = cols;
            nodeChanged = true;
          }
        } else if (edge.targetHandle === "right") {
          if (!arraysEqual(newRightCols, cols)) {
            newRightCols = cols;
            nodeChanged = true;
          }
        } else if (isMultiInput) {
          if (!newLeftCols || newLeftCols.length === 0) {
            if (!arraysEqual(newLeftCols, cols)) {
              newLeftCols = cols;
              nodeChanged = true;
            }
          } else if (!newRightCols || newRightCols.length === 0) {
            if (!arraysEqual(newRightCols, cols)) {
              newRightCols = cols;
              nodeChanged = true;
            }
          }
        } else {
          if (!arraysEqual(newInputCols, cols)) {
            newInputCols = cols;
            nodeChanged = true;
          }
        }
      }

      if (nodeChanged) {
        hasChanges = true;
        return {
          ...targetNode,
          data: {
            ...targetNode.data,
            ...(newLeftCols !== undefined ? { leftColumns: newLeftCols } : {}),
            ...(newRightCols !== undefined ? { rightColumns: newRightCols } : {}),
            ...(newInputCols !== undefined ? { inputColumns: newInputCols } : {}),
          },
        };
      }
      return targetNode;
    });

    if (hasChanges) {
      setNodes(updatedNodes);
    }
  }, [edges, nodes, isReadOnly, setNodes]);

  const onDrop = useCallback(
    (event: any) => {
      if (isReadOnly) return;
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

      let extraData: any = {};

      // Auto-inject deskBlockId for desk-type nodes
      const deskNodeTypes = ["DeskTextInputNode", "DeskSheetNode", "TabInputNode", "OutputPreviewNode", "TrueFalseNode", "BlockOutputSenderNode", "MasterSheetPreviewNode"];
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
    [reactFlowInstance, pushHistory, deskBlockId, isReadOnly]
  );

  const onNodeDragStop = useCallback(() => {
    if (isReadOnly) return;
    pushHistory();
  }, [pushHistory, isReadOnly]);

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
          defaultViewport={cachedViewport}
          fitView={!cachedViewport}
          onMoveEnd={onMoveEnd}
          minZoom={0.2}
          maxZoom={3}
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          edgesReconnectable={!isReadOnly}
          deleteKeyCode={isReadOnly ? null : "Delete"}
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
