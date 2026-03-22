import { useEditorWorkFlow } from '@/context/WorkFlowContextProvider'
import { EditorCanvasCardType } from '@/lib/types'
import { Position, useNodeId } from '@xyflow/react'
import CustomHandle from '../custom-hook'
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Badge } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'

const EditorCanvasCardSingle = ({ data }: { data: EditorCanvasCardType }) => {
  const nodeId = useNodeId()

  return (
    <>
      {data.type !== 'Trigger' && data.type !== 'Google Drive' && (
        <CustomHandle
          type="target"
          position={Position.Top}
          style={{ zIndex: 100 }}
        />
      )}
      <Card
        className="relative dark:border-muted-foreground/70"
      >
        <CardHeader className="flex flex-row items-center gap-4">
          <div>logo</div>
          <div>
            <CardTitle className="text-md">{data.title}</CardTitle>
            <CardDescription>
              <p className="text-xs text-muted-foreground/50">
                <b className="text-muted-foreground/80">ID: </b>
                {nodeId}
              </p>
              <p>{data.description}</p>
            </CardDescription>
          </div>
        </CardHeader>
        <Badge
          className="absolute right-2 top-2"
        >
          {data.type}
        </Badge>
        <div
          className={cn('absolute left-3 top-4 h-2 w-2 rounded-full', {
            'bg-green-500': Math.random() < 0.6,
            'bg-orange-500': Math.random() >= 0.6 && Math.random() < 0.8,
            'bg-red-500': Math.random() >= 0.8,
          })}
        ></div>
      </Card>
      <CustomHandle
        type="source"
        position={Position.Bottom}
        id="a"
      />
    </>
  )
}

export default EditorCanvasCardSingle
