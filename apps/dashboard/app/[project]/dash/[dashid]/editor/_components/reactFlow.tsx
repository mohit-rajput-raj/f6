"use client";
import React, { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Position,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { IconFileText } from "@tabler/icons-react";
import { he } from "zod/locales";
import { DrawerDemo } from "../../../../../../components/dashboard/flow/Node/drawer";
import { BaseNodeFullDemo } from "./base-node";
import { ActionBarNodeDemo } from "./BaseNode-action-bar";
import { ContextMenuDemo } from "./ContextMenu";
const nodeTypes = {
  baseNodebar: ActionBarNodeDemo,
  baseNodeFull: BaseNodeFullDemo,
};
const nodeDefaults = {
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
};

const initialNodes = [
  {
    id: "1",
    position: { x: 900, y: 150 },
    data: { label: <span className="text-black">handler</span> },
    ...nodeDefaults,
  },
  {
    id: "2",
    position: { x: 250, y: 0 },
    data: {
      label: (
        <span className="text-black flex items-center gap-2">
          Node 14 <IconFileText size={20} />
        </span>
      ),
    },
    ...nodeDefaults,
  },
  {
    id: "3",
    position: { x: 250, y: 150 },
    data: {
      label: (
        <span className="text-black flex items-center gap-2">
          Node 11 <IconFileText size={20} />
        </span>
      ),
    },
    ...nodeDefaults,
  },
  {
    id: "4",
    position: { x: 450, y: 300 },

    data: {
      label: (
        <span className="text-black flex items-center gap-2">
          Node 12 <IconFileText size={20} />
        </span>
      ),
    },
    ...nodeDefaults,
  },

];

const initialEdges = [
  {
    id: "e1-2",
    source: "2",
    target: "1",
    animated: true,
  },
  {
    id: "e1-3",
    source: "3",
    target: "1",
    animated: true,
  },
  {
    id: "e1-4",
    source: "4",
    target: "1",
  },
];

const Flow = () => {

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

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

  return (
    <div className="w-full h-[100%]">
      <ContextMenuDemo>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        >
        <Background />
        <Controls className="dark:text-zinc-800" />
        <MiniMap />
      </ReactFlow>
        </ContextMenuDemo>
    </div>
  );
};

export default Flow;
