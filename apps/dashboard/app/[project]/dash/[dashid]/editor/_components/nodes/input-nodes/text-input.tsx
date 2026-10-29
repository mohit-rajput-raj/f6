import { memo, useState } from "react";
import { Position } from "@xyflow/react";
import { Type } from "lucide-react";

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
import { Textarea } from "@repo/ui/components/ui/textarea";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

export const InputText = memo(({ selected }: { selected?: boolean }) => {
  const [text, setText] = useState("");
  const handleDelete = useDeleteNode();

  return (
    <BaseNode variant="input" selected={selected} className="min-w-[260px]">
      <BaseNodeHeader variant="input">
        <BaseNodeIcon variant="input">
          <Type className="size-4" />
        </BaseNodeIcon>
        <BaseNodeHeaderTitle>Input Text</BaseNodeHeaderTitle>
        <NodeHeaderActions>
          <NodeMenu />
          <IconTrash
            className="size-4 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDelete}
          />
        </NodeHeaderActions>
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-2">
        <TextInput value={text} onChange={setText} />
      </BaseNodeContent>

      <NodeHandle variant="input" type="source" position={Position.Right} id="out" />
    </BaseNode>
  );
});

InputText.displayName = "InputText";

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function TextInput({ value, onChange }: TextInputProps) {
  return (
    <div className="space-y-1.5">
      <Textarea
        placeholder="Enter your text..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] resize-none text-xs nodrag"
      />

      <p className="text-[10px] text-muted-foreground text-right">
        {value.length} characters
      </p>
    </div>
  );
}