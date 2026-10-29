import { Position, useNodeId } from '@xyflow/react'
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeIcon,
  NodeHandle,
} from "@/components/dashboard/flow/Node/baseNode";
import { Badge } from '@repo/ui/components/ui/badge'
import { Workflow } from 'lucide-react'
import { EditorCanvasCardType } from '@/lib/types'

const EditorCanvasCardSingle = ({ data, selected }: { data: EditorCanvasCardType; selected?: boolean }) => {
  const nodeId = useNodeId()

  return (
    <BaseNode variant="default" selected={selected} className="min-w-[260px]">
      {data.type !== 'Trigger' && data.type !== 'Google Drive' && (
        <NodeHandle
          variant="default"
          type="target"
          position={Position.Top}
        />
      )}

      <BaseNodeHeader variant="default">
        <BaseNodeIcon variant="default">
          <Workflow className="size-4" />
        </BaseNodeIcon>
        <div className="min-w-0">
          <BaseNodeHeaderTitle>{data.title || "Step Node"}</BaseNodeHeaderTitle>
          <p className="text-[10px] text-muted-foreground truncate">{data.type}</p>
        </div>
        {data.type && (
          <Badge variant="outline" className="text-[9px] ml-auto">
            {data.type}
          </Badge>
        )}
      </BaseNodeHeader>

      <BaseNodeContent className="p-3.5 space-y-1.5 text-xs">
        <p className="text-muted-foreground">{data.description || "Configured workflow step"}</p>
        <p className="text-[10px] font-mono text-muted-foreground/60">ID: {nodeId}</p>
      </BaseNodeContent>

      <NodeHandle
        variant="default"
        type="source"
        position={Position.Bottom}
        id="a"
      />
    </BaseNode>
  )
}

export default EditorCanvasCardSingle

