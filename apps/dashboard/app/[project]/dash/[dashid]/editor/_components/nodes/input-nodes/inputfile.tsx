'use client'

import { memo, useCallback, useEffect, useState, useRef } from "react";
import { Position, useReactFlow } from "@xyflow/react";
import { Upload, FileText, Image, Video, X } from "lucide-react";
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
import api from "@/lib/axios";
import { NodeData } from "./test-nodes";

export const InputFileNode = memo(({ id }: { data: NodeData; id: string }) => {
  const [file, setFile] = useState<File | null>(null);
  const handleDelete = useDeleteNode();
  const { setNodes } = useReactFlow();

  const updateText = useCallback((newText: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, text: newText } } : node
      )
    );
  }, [id, setNodes]);

  useEffect(() => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = async () => {
      try {
        const data = await api.post("/process-json-stream", form);
        updateText(data.data);
      } catch (err) {
        console.error(err);
      }
    };
    res();
  }, [file, updateText]);

  return (
    <BaseNode variant="input" className="min-w-[280px]">
      <BaseNodeHeader variant="input">
        <div className="flex items-center gap-2 min-w-0">
          <BaseNodeIcon variant="input">
            <Upload className="size-3.5" />
          </BaseNodeIcon>
          <BaseNodeHeaderTitle>File Input</BaseNodeHeaderTitle>
        </div>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5">
        <FileInput file={file} onChange={setFile} />
      </BaseNodeContent>

      <NodeHandle
        variant="input"
        type="source"
        position={Position.Right}
      />
    </BaseNode>
  );
});

InputFileNode.displayName = "InputFileNode";

type FileInputProps = {
  file?: File | null;
  onChange: (file: File | null) => void;
};

export function FileInput({ file, onChange }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files?.[0] ?? null);
  };

  const getIcon = () => {
    if (!file) return <Upload className="size-5 text-sky-500" />;
    if (file.type.startsWith("image")) return <Image className="size-5 text-sky-500" />;
    if (file.type.startsWith("video")) return <Video className="size-5 text-sky-500" />;
    return <FileText className="size-5 text-sky-500" />;
  };

  return (
    <div className="border border-dashed border-border/60 rounded-xl p-3 text-center space-y-2 bg-muted/20 nodrag">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer py-2"
        >
          {getIcon()}
          <span className="font-medium">Drop file or click to upload</span>
          <span className="text-[10px] text-muted-foreground/70">.xlsx, .csv, and more</span>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {getIcon()}
            <div className="text-left min-w-0">
              <p className="text-xs font-medium truncate max-w-[150px]">
                {file.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            className="h-6 w-6"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
