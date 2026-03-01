import { memo, useState, useEffect } from "react";
import { Handle, Position, useNodeId } from "@xyflow/react";
import { useEditorWorkFlow } from "@/context/WorkFlowContextProvider";
// import { useEditorWorkFlow } from "@/context/EditorWorkFlowContext";

export const FilterCsvNode = memo(() => {
  const nodeId = useNodeId();
  const { setNodes } = useEditorWorkFlow();

  const [field, setField] = useState("");
  const [operator, setOperator] = useState("=");
  const [value, setValue] = useState("");

  // Sync parameters into node.data
  useEffect(() => {
    if (!nodeId) return;

    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                parameters: { field, operator, value },
              },
            }
          : node
      )
    );
  }, [field, operator, value, nodeId, setNodes]);

  return (
    <>
      <div className="bg-white border rounded-md p-3 w-60 shadow">
        <h3 className="font-semibold text-sm mb-2">Filter Table</h3>

        <input
          className="border p-1 w-full text-sm mb-2"
          placeholder="Column name"
          value={field}
          onChange={(e) => setField(e.target.value)}
        />

        <select
          className="border p-1 w-full text-sm mb-2"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        >
          <option value="=">=</option>
          <option value="!=">!=</option>
          <option value=">">&gt;</option>
          <option value="<">&lt;</option>
          <option value="contains">contains</option>
        </select>

        <input
          className="border p-1 w-full text-sm"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
});

FilterCsvNode.displayName = "FilterCsvNode";

type Row = Record<string, any>;

export function executeFilter(
  input: Row[],
  parameters: {
    field: string;
    operator: string;
    value: string;
  }
) {
  const { field, operator, value } = parameters;

  return input.filter((row) => {
    const cellValue = row[field];

    switch (operator) {
      case "=":
        return String(cellValue) === value;

      case "!=":
        return String(cellValue) !== value;

      case ">":
        return Number(cellValue) > Number(value);

      case "<":
        return Number(cellValue) < Number(value);

      case "contains":
        return String(cellValue).includes(value);

      default:
        return true;
    }
  });
}