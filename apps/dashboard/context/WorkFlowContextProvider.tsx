"use client";

import React, { createContext, useContext, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { buildWorkflowJson } from "./build-workfow-json";

import { EditorActions, EditorNodeType } from "@/lib/types";
import { Dispatch, useReducer } from "react";

export type EditorNode = EditorNodeType;

export type Editor = {
  elements: EditorNode[];
  edges: {
    id: string;
    source: string;
    target: string;
  }[];
  selectedNode: EditorNodeType;
};

export type HistoryState = {
  history: Editor[];
  currentIndex: number;
};

export type EditorState = {
  editor: Editor;
  history: HistoryState;
};

const initialEditorState: EditorState["editor"] = {
  elements: [],
  selectedNode: {
    data: {
      completed: false,
      current: false,
      description: "",
      metadata: {},
      title: "",
      type: "Trigger",
    },
    id: "",
    position: { x: 0, y: 0 },
    type: "Trigger",
  },
  edges: [],
};

const initialHistoryState: HistoryState = {
  history: [initialEditorState],
  currentIndex: 0,
};

const initialState: EditorState = {
  editor: initialEditorState,
  history: initialHistoryState,
};

const editorReducer = (
  state: EditorState = initialState,
  action: EditorActions,
): EditorState => {
  switch (action.type) {
    case "REDO":
      if (state.history.currentIndex < state.history.history.length - 1) {
        const nextIndex = state.history.currentIndex + 1;
        const nextEditorState = { ...state.history.history[nextIndex] };
        const redoState = {
          ...state,
          editor: nextEditorState,
          history: {
            ...state.history,
            currentIndex: nextIndex,
          },
        };
        return redoState;
      }
      return state;

    case "UNDO":
      console.log(state);
      
      if (state.history.currentIndex > 0) {
        const prevIndex = state.history.currentIndex - 1;
        const prevEditorState = { ...state.history.history[prevIndex] };
        const undoState = {
          ...state,
          editor: prevEditorState,
          history: {
            ...state.history,
            currentIndex: prevIndex,
          },
        };
        return undoState;
      }
      return state;

    case "LOAD_DATA":
      // console.log("loaded", state.editor);
      
      return {
        ...state,
        editor: {
          ...state.editor,
          elements: action.payload.elements || initialEditorState.elements,
          edges: action.payload.edges,
        },
      };
    case "SELECTED_ELEMENT":
      return {
        ...state,
        editor: {
          ...state.editor,
          selectedNode: action.payload.element,
        },
      };
    default:
      return state;
  }
};

export type EditorContextData = {
  previewMode: boolean;
  setPreviewMode: (previewMode: boolean) => void;
};

// export const EditorContext = createContext<{
//   state: EditorState
//   dispatch: Dispatch<EditorActions>
// }>({
//   state: initialState,
//   dispatch: () => undefined,
// })

type EditorProps = {
  children: React.ReactNode;
};
type EditorWorkFlowContextType = {
  nodes: EditorNodeType[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<EditorNodeType[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  handleRun: () => void;
  state: EditorState;
  dispatch: Dispatch<EditorActions>;
};

const EditorWorkFlowContext = createContext<
  EditorWorkFlowContextType | undefined
>({
  state: initialState,
  dispatch: () => undefined,
  nodes: [],
  edges: [],
  setNodes: () => undefined,
  setEdges: () => undefined,
  handleRun: () => undefined,
});

const initialNodes: EditorNodeType[] = []

const initialEdges: Edge[] = []
export const EditorWorkFlowContextProvider = ({ children }: EditorProps) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [nodes, setNodes] = useState<EditorNodeType[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const handleRun = () => {
    const workflowJson = buildWorkflowJson(nodes, edges);

    console.log(workflowJson);
  };

  return (
    <EditorWorkFlowContext.Provider
      value={{ nodes, edges, setNodes, setEdges, handleRun, state, dispatch }}
    >
      {children}
    </EditorWorkFlowContext.Provider>
  );
};

export const useEditorWorkFlow = () => {
  const ctx = useContext(EditorWorkFlowContext);
  if (!ctx) {
    throw new Error(
      "useEditorWorkFlow must be used inside EditorWorkFlowContextProvider",
    );
  }
  return ctx;
};
