import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Type } from "lucide-react";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/dashboard/flow/Node/baseNode";

import { NodeMenu } from "../node-menu";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

export const InputText = memo(() => {
  const [text, setText] = useState("");
  const handleDelete = useDeleteNode();

  return (
    <>
      <div>
        <div className="flex justify-between items-center ">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer p-0 text-red-300" onClick={handleDelete} />
      </div>
      </div>

      <BaseNode>
        <BaseNodeHeader className="border-b flex items-center gap-2">
          <Type className="size-4" />
          <BaseNodeHeaderTitle>Input Text</BaseNodeHeaderTitle>
        </BaseNodeHeader>

        <BaseNodeContent>
          <TextInput value={text} onChange={setText} />
        </BaseNodeContent>
      </BaseNode>

      <Handle type="source" position={Position.Right} />
    </>
  );
});

InputText.displayName = "InputText";

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function TextInput({ value, onChange }: TextInputProps) {
  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Enter your text..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] resize-none"
      />

      <p className="text-xs text-muted-foreground text-right">
        {value.length} characters
      </p>
    </div>
  );
}