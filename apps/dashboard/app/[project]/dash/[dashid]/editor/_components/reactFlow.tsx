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
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { IconFileText } from "@tabler/icons-react";
import { he } from "zod/locales";
import { BaseNodeFullDemo } from "./nodes/base-node";
import { ActionBarNodeDemo } from "./nodes/BaseNode-action-bar";
import { ContextMenuDemo } from "./ContextMenu";
import { useUIStore } from "@/stores/ui.store";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
// import { InputNode } from "./nodes/input-node";
import { OutputNode } from "./nodes/output-node";
import { InputFileNode } from "./nodes/input-nodes/inputfile";
import { InputImage } from "./nodes/input-nodes/input-image";
import { InputText } from "./nodes/input-nodes/text-input";
import { FilterCsvNode } from "./nodes/calcy-nodes/filter-node";
import { usePathname } from "next/navigation";
import { EditorCanvasCardType } from "@/lib/types";
import { toast } from "sonner";
export const nodeTypes = {
  InputImage:InputImage,
  TextInputNode:TextInputNode,
  FilterCsvNode:EditorCanvasCardSingle,
  baseNodebar: ActionBarNodeDemo,
  baseNodeFull: BaseNodeFullDemo,
  // baseInputNode: InputNode,
  baseOutput: OutputNode,
  InputFileNode:InputFileNode,
  InputText:InputText,
};
const nodeDefaults = {
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

// const initialNodes: EditorNodeType[] = []
import { v4 } from 'uuid'
import { EditorCanvasDefaultCardTypes } from "@/app/constants/nodes-desp";
import EditorCanvasCardSingle from "./nodes/input-nodes/canvas-card";
import { CamelCaseNode, TextInputNode } from "./nodes/input-nodes/test-nodes";
import { OutputNode2 } from "./nodes/output-nodes/textoutput";
import { LowercaseNode } from "./nodes/calcy-nodes/lowercase";

const Flow = () => {
  const nodeTypess = useMemo(
    () => ({
      OutputNode2:OutputNode2,
      LowercaseNode:LowercaseNode,


      CamelCaseNode:CamelCaseNode,
      TextInputNode:TextInputNode,
      InputImage:InputImage,
  FilterCsvNode:EditorCanvasCardSingle,
  baseNodebar: ActionBarNodeDemo,
  baseNodeFull: BaseNodeFullDemo,
  // baseInputNode: InputNode,
  baseOutput: OutputNode,
  InputFileNode:InputFileNode,
  InputText:InputText,
    }),
    []
  )
  const { minimapOpen } = useUIStore();
// const [nodes, setNodes] = useState(initialNodes)
//   const [edges, setEdges] = useState(initialEdges)
 const {edges,nodes,setEdges,setNodes , state , dispatch}=useEditorWorkFlow()
 const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance>()
  const pathname = usePathname()

  const onDragOver = useCallback((event: any) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])
  const onNodesChange = useCallback(
    (changes  : any) => {
      setNodes((oldNodes) => applyNodeChanges(changes, oldNodes));
    },
    [setNodes],
  );
   const onConnect = useCallback(
    (connection : any) => {
      setEdges((oldEdges) => addEdge(connection, oldEdges));
    },
    [setEdges],
  );
  const onEdgesChange = useCallback(
    (changes : any) => {
      setEdges((oldEdges) => applyEdgeChanges(changes, oldEdges));
    },
    [setEdges],
  );
   const onDrop = useCallback(
    (event: any) => {
      event.preventDefault()

      const type: EditorCanvasCardType['type'] = event.dataTransfer.getData(
        'application/reactflow'
      )

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return
      }

      const triggerAlreadyExists = state.editor.elements.find(
        (node) => node.type === 'Trigger'
      )

      if (type === 'Trigger' && triggerAlreadyExists) {
        toast('Only one trigger can be added to automations at the moment')
        return
      }

      // reactFlowInstance.project was renamed to reactFlowInstance.screenToFlowPosition
      // and you don't need to subtract the reactFlowBounds.left/top anymore
      // details: https://reactflow.dev/whats-new/2023-11-10
      if (!reactFlowInstance) return
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode = {
        id: v4(),
        type,
        position,
        data: {
          title: type,
          description: EditorCanvasDefaultCardTypes[type].description,
          completed: false,
          current: false,
          metadata: {},
          type: type,
        },
      }
      //@ts-ignore
      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, state]
  )
  const handleClickCanvas = () => {
    dispatch({
      type: 'SELECTED_ELEMENT',
      payload: {
        element: {
          data: {
            completed: false,
            current: false,
            description: '',
            metadata: {},
            title: '',
            type: 'Trigger',
          },
          id: '',
          position: { x: 0, y: 0 },
          type: 'Trigger',
        },
      },
    })
  }
useEffect(() => {
    dispatch({ type: 'LOAD_DATA', payload: { edges, elements: nodes } })
  }, [nodes, edges])

  return (
    <div className="w-full h-[100%]">
      <ContextMenuDemo>


      <ReactFlow
        // nodes={nodes}
        edges={edges}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodes={state.editor.elements}
        nodeTypes={nodeTypess}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onClick={handleClickCanvas}
        onInit={setReactFlowInstance}
        fitView
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
