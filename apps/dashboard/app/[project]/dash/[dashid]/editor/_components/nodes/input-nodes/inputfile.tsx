'use client'
import { memo, useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Rocket } from "lucide-react";
import { Upload, FileText, Image, Video, X } from "lucide-react";
import { useRef } from "react";
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
import api from "@/lib/axios";


export const InputFileNode = memo(() => {
  const [file, setFile] = useState<File | null>(null);
  const handleDelete = useDeleteNode();

  useEffect(() => {
    if(!file) return;
    const form = new FormData();
    form.append("file", file);
    const res =async () => {
      const data = await api.post("/process-csv-json",form);
      console.log(data);
    };
    res();
    
  }, [file]);

  return (
    <>
    <div className="flex justify-between items-center ">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer p-0 text-red-300" onClick={handleDelete} />
      </div>
      <BaseNode>
        <BaseNodeHeader className="border-b flex items-center gap-2">
          <Rocket className="size-4" />
          <BaseNodeHeaderTitle>Input File</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent>
          <FileInput file={file} onChange={setFile} />
        </BaseNodeContent>
      </BaseNode>

      <Handle
        type="source"
        position={Position.Right}
      />
    </>
  );
});

InputFileNode.displayName = "InputFileNode";




// import { NodeMenu } from "../node-menu";

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
    if (!file) return <Upload className="size-5 text-muted-foreground" />;
    if (file.type.startsWith("image")) return <Image className="size-5" />;
    if (file.type.startsWith("video")) return <Video className="size-5" />;
    return <FileText className="size-5" />;
  };

  return (
    <div className="border border-dashed rounded-md p-3 text-center space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {getIcon()}
          <span>Drop file here or click to upload</span>
          <span className="text-xs">Any file supported</span>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            <div className="text-left">
              <p className="text-sm font-medium truncate max-w-[120px]">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
