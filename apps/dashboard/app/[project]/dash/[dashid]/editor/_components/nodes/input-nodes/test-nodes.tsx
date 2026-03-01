'use client';

import React, { memo, useCallback, useState } from 'react';
import  {ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  Node,
  Edge,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ─────────────────────────────────────────────────────────────
// 1. TYPES & HELPERS
// ─────────────────────────────────────────────────────────────
export type NodeData = {
  label?: string;
  text?: string;           // for TextInputNode
  result?: string;         // runtime result (filled by executor)
  [key: string]: any;
};

const toCamelCase = (str: string): string => {
    return str.toUpperCase()
//   return str
//     .trim()
//     .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
//     .replace(/^./, (s) => s.toLowerCase());
};

// ─────────────────────────────────────────────────────────────
// 2. CUSTOM NODES
// ─────────────────────────────────────────────────────────────

// TEXT INPUT NODE
export const TextInputNode = memo(({ data, id }: { data: NodeData; id: string }) => {
  const { setNodes } = useReactFlow();

  const updateText = useCallback((newText: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, text: newText } } : node
      )
    );
  }, [id, setNodes]);

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm w-[280px] overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2 font-medium">
        <span>📝</span>
        Text Input
      </div>

      <div className="p-4">
        <textarea
          value={data.text || ''}
          onChange={(e) => updateText(e.target.value)}
          placeholder="Type anything here..."
          className="w-full h-28 resize-y border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-blue-600" />
    </div>
  );
});
TextInputNode.displayName = 'TextInputNode';

// CAMEL CASE CONVERTER NODE
export const CamelCaseNode = memo(({ data, id }: { data: NodeData; id: string }) => {
  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm w-[280px] overflow-hidden">
      <div className="bg-violet-600 text-white px-4 py-2 flex items-center gap-2 font-medium">
        <span>🔄</span>
        To Camel Case
      </div>

      <div className="p-4 text-center text-sm text-gray-500">
        Takes input from left → converts to camelCase
        <br />
        <span className="text-xs">(e.g. "hello world" → "helloWorld")</span>
      </div>

      <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-violet-600" />
      <Handle type="source" position={Position.Right} id="out" className="w-3 h-3 bg-violet-600" />
    </div>
  );
});
CamelCaseNode.displayName = 'CamelCaseNode';

// OUTPUT NODE (displays final result)
export const OutputNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm w-[320px] overflow-hidden">
      <div className="bg-emerald-600 text-white px-4 py-2 flex items-center gap-2 font-medium">
        <span>📤</span>
        Output Display
      </div>

      <div className="p-6 min-h-[140px] flex items-center justify-center">
        {data.result ? (
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-emerald-600 mb-1">RESULT</div>
            <div className="font-mono text-lg bg-gray-50 p-4 rounded border border-emerald-200 break-all">
              {data.result}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 italic">Run the workflow to see output here...</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="in" className="w-3 h-3 bg-emerald-600" />
    </div>
  );
});
OutputNode.displayName = 'OutputNode';

// ─────────────────────────────────────────────────────────────
// 3. EXECUTION ENGINE (full architecture)
// ─────────────────────────────────────────────────────────────
const executeWorkflow = async (
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
) => {
  // 1. Clear previous results
  setNodes((nds) =>
    nds.map((n) => ({ ...n, data: { ...n.data, result: undefined } }))
  );

  // 2. Build adjacency list + incoming count for topological sort
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    graph.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // 3. Start with nodes that have no incoming edges (TextInput in our demo)
  const queue = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
  const runtimeData = new Map<string, any>();

  // 4. Process in topological order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentId)!;

    let inputValue: any = '';

    // Find incoming data
    const incomingEdge = edges.find((e) => e.target === currentId);
    if (incomingEdge) {
      inputValue = runtimeData.get(incomingEdge.source) || '';
    } else {
      // Source node → take its own data
      inputValue = currentNode.data.text || '';
    }

    let outputValue: any = inputValue;

    // Node-specific logic
    switch (currentNode.type) {
      case 'textInput':
        outputValue = currentNode.data.text || '';
        break;

      case 'camelCase':
        outputValue = toCamelCase(String(inputValue));
        break;

      case 'output':
        outputValue = inputValue; // just pass through
        break;

      default:
        outputValue = inputValue;
    }

    runtimeData.set(currentId, outputValue);

    // Update node UI with result (for OutputNode and others)
    setNodes((nds) =>
      nds.map((node) =>
        node.id === currentId
          ? { ...node, data: { ...node.data, result: outputValue } }
          : node
      )
    );

    // Decrease inDegree of children
    graph.get(currentId)!.forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }
};

// ─────────────────────────────────────────────────────────────
// 4. MAIN FLOW COMPONENT (ready to drop into your project)
// ─────────────────────────────────────────────────────────────
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'textInput',
    position: { x: 100, y: 150 },
    data: { text: 'hello world this is a test' },
  },
  {
    id: '2',
    type: 'camelCase',
    position: { x: 450, y: 150 },
    data: {},
  },
  {
    id: '3',
    type: 'output',
    position: { x: 800, y: 150 },
    data: {},
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, type: 'smoothstep' },
  { id: 'e2-3', source: '2', target: '3', animated: true, type: 'smoothstep' },
];

export default function DemoCamelCaseFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);

//   const { setViewport } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await executeWorkflow(nodes, edges, setNodes);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="font-semibold text-xl">Demo: Text → CamelCase → Output</div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : '▶ Run Workflow'}
        </button>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={{
            textInput: TextInputNode,
            camelCase: CamelCaseNode,
            output: OutputNode,
          }}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border-t p-4 text-xs text-gray-500">
        How it works: Edit text in first node → click <strong>Run Workflow</strong> → result appears in Output node.<br />
        You can drag new connections, move nodes, etc. The execution engine handles any order/topology.
      </div>
    </div>
  );
}