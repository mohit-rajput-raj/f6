"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, useNodeId } from "@xyflow/react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";

export const InputImage = memo(() => {
  const [file, setFile] = useState<File | null>(null);
  const handleDelete = useDeleteNode();
const { dispatch, state } = useEditorWorkFlow()
const nodeId = useNodeId()
  return (
    <>
      <div className="flex justify-between items-center ">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer p-0 text-red-300" onClick={handleDelete} />
      </div>
      <BaseNode
      onClick={(e) => {
          e.stopPropagation()
          const val = state.editor.elements.find((n) => n.id === nodeId)
          if (val)
            dispatch({
              type: 'SELECTED_ELEMENT',
              payload: {
                element: val,
              },
            })
        }}>
        <BaseNodeHeader className="border-b flex items-center gap-2">
          <ImageIcon className="size-4" />
          <BaseNodeHeaderTitle>Input Image</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent>
          <ImageInput file={file} onChange={setFile} />
        </BaseNodeContent>
      </BaseNode>

      <Handle type="source" position={Position.Right} />
    </>
  );
});

InputImage.displayName = "InputImage";


type ImageInputProps = {
  file: File | null;
  onChange: (file: File | null) => void;
};

function ImageInput({ file, onChange }: ImageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;

    if (selected && !selected.type.startsWith("image/")) {
      alert("Only image files are allowed.");
      return;
    }

    onChange(selected);
  };

  return (
    <div className="border border-dashed rounded-md p-3 text-center space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Upload className="size-5" />
          <span>Click to upload image</span>
          <span className="text-xs">PNG, JPG, WEBP supported</span>
        </button>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="rounded-md max-h-30 mx-auto object-contain border"
          />

          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => onChange(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}