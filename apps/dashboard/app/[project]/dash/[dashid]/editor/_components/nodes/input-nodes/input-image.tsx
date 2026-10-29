"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Position } from "@xyflow/react";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeIcon,
  NodeHeaderActions,
  NodeHandle,
} from "@/components/dashboard/flow/Node/baseNode";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

export const InputImage = memo(({ selected }: { selected?: boolean }) => {
  const [file, setFile] = useState<File | null>(null);
  const handleDelete = useDeleteNode();

  return (
    <BaseNode variant="input" selected={selected} className="min-w-[260px]">
      <BaseNodeHeader variant="input">
        <BaseNodeIcon variant="input">
          <ImageIcon className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Input Image</BaseNodeHeaderTitle>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5">
        <ImageInput file={file} onChange={setFile} />
      </BaseNodeContent>

      <NodeHandle variant="input" type="source" position={Position.Right} id="out" />
    </BaseNode>
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