import type React from "react";
import type { Edge } from "@xyflow/react";
import type { EditorNodeType } from "@/lib/types";
import {
  applyFilter,
  applyMathColumn,
  applyMathRow,
  applySort,
  applyAggregate,
  applyFormula,
  applyMerge,
  applyUpdateMerge,
  applySheetMerge,
  applyAppend,
  applyColumnMap,
  applyRenameColumn,
  applySelectColumns,
  applyCountInRow,
  toCamelCase,
  toLowercase,
  applyUnionMerge,
  applyDropColumns,
  applyIfElse,
  applySwitchCase,
  applySubjectBlock,
  applyBlockConcat,
  applyDynamicBlockConcat,
  Dataset,
} from "./functions";
import api from "@/lib/axios";

// ────────────────────────────────────────────────
// Execution engine — topological sort + reactive propagation
// ────────────────────────────────────────────────

export const executeWorkflow = async (
  nodes: EditorNodeType[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<EditorNodeType[]>>
) => {
  // 1. Clear previous results & propagate input columns
  setNodes((nds) =>
    nds.map((n) => ({
      ...n,
      data: { ...n.data, result: undefined, rowCount: undefined, error: undefined },
    }))
  );

  // 2. Build graph
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    graph.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // 3. Start with source nodes (no incoming)
  const queue = nodes
    .filter((n) => inDegree.get(n.id) === 0)
    .map((n) => n.id);
  const runtimeData = new Map<string, any>();

  // 4. Process in topological order
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentId)!;

    // Find all incoming connections
    const incomingEdges = edges.filter((e) => e.target === currentId);
    let inputValue: any = null;

    if (incomingEdges.length === 1) {
      const e = incomingEdges[0];
      inputValue = runtimeData.get(`${e.source}__${e.sourceHandle}`) ?? runtimeData.get(e.source) ?? null;
    } else if (incomingEdges.length === 0) {
      // Source node — use its own data
      inputValue = (currentNode.data as any)?.text ?? "";
    }
    // For MergeNode — handled separately below

    let outputValue: any = inputValue;
    const nodeData = currentNode.data as any;

    try {
      switch (currentNode.type) {
        case "TextInputNode":
          outputValue = nodeData?.text ?? "";
          break;

        case "InputFileNode":
        case "SpreadsheetInputNode":
        case "DataLibraryInputNode": {
          // All store parsed data in data.text as { columns, data }
          const fileData = nodeData?.text;
          if (fileData && typeof fileData === "object" && fileData.columns) {
            outputValue = fileData as Dataset;
          } else {
            outputValue = { columns: [], data: [] };
          }
          break;
        }

        // ── Publish boundary nodes ──
        case "WorkflowInputNode": {
          // During normal editing: pass through incoming data
          // During inner execution: data is injected by SubflowNode handler
          outputValue = inputValue ?? { columns: [], data: [] };
          break;
        }

        case "WorkflowOutputNode": {
          // Collect incoming data — this is the output of the publishable workflow
          outputValue = inputValue ?? { columns: [], data: [] };
          break;
        }

        case "CamelCaseNode":
          if (typeof inputValue === "string") {
            outputValue = toCamelCase(inputValue);
          } else {
            outputValue = toCamelCase(String(JSON.stringify(inputValue) ?? ""));
          }
          break;

        case "LowercaseNode":
          if (typeof inputValue === "string") {
            outputValue = toLowercase(inputValue);
          } else {
            outputValue = toLowercase(String(JSON.stringify(inputValue) ?? ""));
          }
          break;

        case "FilterNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyFilter(ds, nodeData?.config ?? {});
          break;
        }

        case "MathColumnNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyMathColumn(ds, nodeData?.config ?? {});
          break;
        }

        case "MathRowNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyMathRow(ds, nodeData?.config ?? {});
          break;
        }

        case "SortNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applySort(ds, nodeData?.config ?? {});
          break;
        }

        case "AggregateNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyAggregate(ds, nodeData?.config ?? {});
          break;
        }

        case "CountNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyCountInRow(ds, nodeData?.config ?? {});
          break;
        }

        case "FormulaNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          const config = nodeData?.config ?? {};

          // Try server-side first, fallback to client
          try {
            const resp = await api.post("/formula", {
              columns: ds.columns,
              data: ds.data,
              formula: config.formula,
              result_column: config.resultColumn,
            });
            outputValue = resp.data as Dataset;
          } catch {
            // Fallback to client-side
            outputValue = applyFormula(ds, config);
          }
          break;
        }

        case "MergeNode": {
          // Find left and right inputs by handle id
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find(
            (e) => e.targetHandle === "right"
          );

          const leftData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };

          outputValue = applyMerge(leftData, rightData, nodeData?.config ?? {});

          // Update node with column info from both sides
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      leftColumns: leftData.columns,
                      rightColumns: rightData.columns,
                    },
                  }
                : node
            )
          );
          break;
        }

        case "RenameColumnNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyRenameColumn(ds, nodeData?.config ?? {});
          break;
        }

        case "SelectColumnsNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applySelectColumns(ds, nodeData?.config ?? {});
          break;
        }

        case "ColumnMapNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyColumnMap(ds, nodeData?.config ?? {});
          break;
        }

        case "DropColumnNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyDropColumns(ds, nodeData?.config ?? {});
          break;
        }

        case "IfElseNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applyIfElse(ds, nodeData?.config ?? {});
          break;
        }

        case "SwitchCaseNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = applySwitchCase(ds, nodeData?.config ?? {});
          break;
        }

        case "UnionMergeNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const leftData: Dataset = leftEdge
            ? (runtimeData.get(`${leftEdge.source}__${leftEdge.sourceHandle}`) ?? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? (runtimeData.get(`${rightEdge.source}__${rightEdge.sourceHandle}`) ?? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          outputValue = applyUnionMerge(leftData, rightData, nodeData?.config ?? {});
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? { ...node, data: { ...node.data, leftColumns: leftData.columns, rightColumns: rightData.columns } }
                : node
            )
          );
          break;
        }

        case "UpdateMergeNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const leftData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          outputValue = applyUpdateMerge(leftData, rightData, nodeData?.config ?? {});
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? { ...node, data: { ...node.data, leftColumns: leftData.columns, rightColumns: rightData.columns } }
                : node
            )
          );
          break;
        }

        case "SheetMergeNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const leftData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const rightData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          outputValue = applySheetMerge(leftData, rightData, nodeData?.config ?? {});
          setNodes((nds) =>
            nds.map((node) =>
              node.id === currentId
                ? { ...node, data: { ...node.data, leftColumns: leftData.columns, rightColumns: rightData.columns } }
                : node
            )
          );
          break;
        }

        case "AppendNode": {
          const leftEdge = incomingEdges.find((e) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e) => e.targetHandle === "right");
          const topData: Dataset = leftEdge
            ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          const bottomData: Dataset = rightEdge
            ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] }
            : { columns: [], data: [] };
          outputValue = applyAppend(topData, bottomData, nodeData?.config ?? {});
          break;
        }

        case "SubflowNode": {
          // Execute the published workflow's full inner graph
          const innerDef = nodeData?.publishedDefinition;
          const innerInputSchema = nodeData?.inputSchema ?? [];
          const innerOutputSchema = nodeData?.outputSchema ?? [];

          if (innerDef && innerDef.nodes && innerDef.edges) {
            // 1. Build a map of input data for each boundary input node
            //    Each SubflowNode handle is named `subflow-in-{boundaryNodeId}`
            const inputDataMap = new Map<string, any>();
            for (const schema of innerInputSchema) {
              // Find the edge connecting to this specific input handle
              const handleId = `subflow-in-${schema.nodeId}`;
              const matchingEdge = incomingEdges.find(e => e.targetHandle === handleId);
              if (matchingEdge) {
                const edgeData = runtimeData.get(`${matchingEdge.source}__${matchingEdge.sourceHandle}`) 
                  ?? runtimeData.get(matchingEdge.source) 
                  ?? { columns: [], data: [] };
                inputDataMap.set(schema.nodeId, edgeData);
              } else {
                inputDataMap.set(schema.nodeId, { columns: [], data: [] });
              }
            }

            // 2. Run inner graph (non-stateful topological execution)
            const innerResult = await executeInnerWorkflow(
              innerDef.nodes,
              innerDef.edges,
              inputDataMap
            );

            // 3. Extract output from WorkflowOutputNode(s)
            if (innerOutputSchema.length > 0) {
              // If multiple outputs, store each under its handle
              if (innerOutputSchema.length === 1) {
                outputValue = innerResult.get(innerOutputSchema[0].nodeId) ?? { columns: [], data: [] };
              } else {
                // Multiple outputs — store per-handle
                for (const outSchema of innerOutputSchema) {
                  const outData = innerResult.get(outSchema.nodeId) ?? { columns: [], data: [] };
                  runtimeData.set(`${currentId}__subflow-out-${outSchema.nodeId}`, outData);
                }
                outputValue = innerResult.get(innerOutputSchema[0].nodeId) ?? { columns: [], data: [] };
              }
            } else {
              // No output boundary — action-only workflow
              outputValue = undefined;
            }
          } else {
            outputValue = inputValue ?? { columns: [], data: [] };
          }
          break;
        }

        case "SheetEditorNode": {
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = ds;
          break;
        }

        case "SubjectBlockNode": {
          // Resolve text inputs from connected nodes
          const subjectCodeEdge = incomingEdges.find(e => e.targetHandle === "subject-code");
          const sectionTypeEdge = incomingEdges.find(e => e.targetHandle === "section-type");
          const keyColNameEdge = incomingEdges.find(e => e.targetHandle === "key-col-name");
          const dataEdge = incomingEdges.find(e => e.targetHandle === "data");

          const subjectCode = subjectCodeEdge
            ? String(runtimeData.get(`${subjectCodeEdge.source}__${subjectCodeEdge.sourceHandle}`) ?? runtimeData.get(subjectCodeEdge.source) ?? "")
            : nodeData?.config?.subjectCode ?? "";
          const sectionType = sectionTypeEdge
            ? String(runtimeData.get(`${sectionTypeEdge.source}__${sectionTypeEdge.sourceHandle}`) ?? runtimeData.get(sectionTypeEdge.source) ?? "")
            : nodeData?.config?.sectionType ?? "";
          const keyColName = keyColNameEdge
            ? String(runtimeData.get(`${keyColNameEdge.source}__${keyColNameEdge.sourceHandle}`) ?? runtimeData.get(keyColNameEdge.source) ?? "")
            : nodeData?.config?.keyColumnName ?? "";
          const blockData: Dataset = dataEdge
            ? (runtimeData.get(`${dataEdge.source}__${dataEdge.sourceHandle}`) ?? runtimeData.get(dataEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };

          // Store resolved values for display
          setNodes(nds =>
            nds.map(node =>
              node.id === currentId
                ? { ...node, data: { ...node.data, resolvedSubjectCode: subjectCode, resolvedSectionType: sectionType, resolvedKeyColumn: keyColName, inputColumns: blockData.columns } }
                : node
            )
          );

          outputValue = applySubjectBlock(blockData, subjectCode, sectionType, keyColName);
          break;
        }

        case "BlockConcatNode": {
          // Resolve sheet name from handle or config
          const sheetNameEdge = incomingEdges.find(e => e.targetHandle === "sheet-name");
          const resolvedSheetName = sheetNameEdge
            ? String(runtimeData.get(`${sheetNameEdge.source}__${sheetNameEdge.sourceHandle}`) ?? runtimeData.get(sheetNameEdge.source) ?? "")
            : "";
          const masterSheetName = resolvedSheetName || nodeData?.config?.sheetName || 'Master Sheet';

          // Base input (Enrollment, Name etc)
          const baseEdge = incomingEdges.find(e => e.targetHandle === "base");
          const baseData: Dataset = baseEdge
            ? (runtimeData.get(`${baseEdge.source}__${baseEdge.sourceHandle}`) ?? runtimeData.get(baseEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };

          // Collect block inputs (block-0 through block-7)
          const blocks: Dataset[] = [];
          for (let i = 0; i < 8; i++) {
            const blockEdge = incomingEdges.find(e => e.targetHandle === `block-${i}`);
            if (blockEdge) {
              const blockData = runtimeData.get(`${blockEdge.source}__${blockEdge.sourceHandle}`) ?? runtimeData.get(blockEdge.source);
              if (blockData && blockData.columns) blocks.push(blockData);
            }
          }

          const keyCol = nodeData?.config?.keyColumn ?? baseData.columns[0] ?? "";
          outputValue = applyBlockConcat(baseData, blocks, keyCol);

          // Extract block codenames from output columns
          const blockCodenames: string[] = [];
          if (outputValue && outputValue.columns) {
            const baseCols = baseData.columns || [];
            for (const col of outputValue.columns) {
              if (baseCols.includes(col)) continue;
              const parts = col.split(':');
              if (parts.length >= 2) {
                const code = `${parts[0]}:${parts[1]}`;
                if (!blockCodenames.includes(code)) blockCodenames.push(code);
              }
            }
          }

          // Push to master sheet store for preview
          if (outputValue && outputValue.columns && outputValue.columns.length > 0) {
            try {
              const { useMasterSheetStore } = await import("@/stores/master-sheet-store");
              useMasterSheetStore.getState().pushData({
                masterSheetName: masterSheetName,
                sheetName: masterSheetName,
                data: outputValue,
                blockCodenames: blockCodenames,
                pushedBy: 'workflow',
                pushedByName: 'Workflow Execution',
                pushedAt: Date.now(),
                sourceNodeId: currentId,
              });
            } catch (e) {
              console.warn("Could not push to master sheet store:", e);
            }
          }

          // Update node with metadata including resolved sheet name
          setNodes(nds =>
            nds.map(node =>
              node.id === currentId
                ? { ...node, data: { ...node.data, baseColumns: baseData.columns, connectedBlocks: blocks.length, resolvedSheetName: resolvedSheetName || undefined } }
                : node
            )
          );
          break;
        }

        case "MasterSheetLibraryNode": {
          // Resolve sheet name from handle or use loaded data
          const msNameEdge = incomingEdges.find(e => e.targetHandle === "sheet-name");
          const resolvedMsName = msNameEdge
            ? String(runtimeData.get(`${msNameEdge.source}__${msNameEdge.sourceHandle}`) ?? runtimeData.get(msNameEdge.source) ?? "")
            : "";

          // If a name is resolved via port, try to load from master sheet store
          if (resolvedMsName) {
            try {
              const { useMasterSheetStore } = await import("@/stores/master-sheet-store");
              const sheet = useMasterSheetStore.getState().sheets[resolvedMsName];
              if (sheet?.data) {
                outputValue = sheet.data as Dataset;
              } else {
                // Fallback to node's loaded data
                outputValue = nodeData?.text ?? { columns: [], data: [] };
              }
            } catch {
              outputValue = nodeData?.text ?? { columns: [], data: [] };
            }
            setNodes(nds =>
              nds.map(node =>
                node.id === currentId
                  ? { ...node, data: { ...node.data, resolvedSheetName: resolvedMsName } }
                  : node
              )
            );
          } else {
            const fileData = nodeData?.text;
            if (fileData && typeof fileData === "object" && fileData.columns) {
              outputValue = fileData as Dataset;
            } else {
              outputValue = { columns: [], data: [] };
            }
          }
          break;
        }

        case "BlockExtractorNode": {
          // Get input data
          const beDataEdge = incomingEdges.find(e => e.targetHandle === "data");
          const beInputData: Dataset = beDataEdge
            ? (runtimeData.get(`${beDataEdge.source}__${beDataEdge.sourceHandle}`) ?? runtimeData.get(beDataEdge.source) ?? { columns: [], data: [] })
            : (inputValue ?? { columns: [], data: [] });

          // Get code and type
          const beCodeEdge = incomingEdges.find(e => e.targetHandle === "code");
          const beTypeEdge = incomingEdges.find(e => e.targetHandle === "type");
          const beCodeRaw = beCodeEdge
            ? String(runtimeData.get(`${beCodeEdge.source}__${beCodeEdge.sourceHandle}`) ?? runtimeData.get(beCodeEdge.source) ?? "")
            : nodeData?.config?.blockCode ?? "";
          const beTypeRaw = beTypeEdge
            ? String(runtimeData.get(`${beTypeEdge.source}__${beTypeEdge.sourceHandle}`) ?? runtimeData.get(beTypeEdge.source) ?? "")
            : nodeData?.config?.sectionType ?? "";

          const beCode = beCodeRaw.trim();
          const beType = beTypeRaw.trim();
          const bePrefix = beCode && beType ? `${beCode}:${beType}:` : "";
          const bePrefixLower = bePrefix.toLowerCase();

          if (!bePrefix || !beInputData?.columns?.length) {
            outputValue = { columns: [], data: [] };
          } else {
            // Find base columns (no ':') and matching prefixed columns
            const baseColumns = beInputData.columns.filter(c => !c.includes(':'));
            const matchingCols = beInputData.columns.filter(c => c.toLowerCase().startsWith(bePrefixLower));
            // Strip prefix from matching columns
            const strippedCols = matchingCols.map(c => {
              // Strip preserving original casing of the suffix
              const lowerC = c.toLowerCase();
              if (lowerC.startsWith(bePrefixLower)) {
                return c.slice(bePrefix.length);
              }
              return c;
            });

            const extractedColumns = [...baseColumns, ...strippedCols];
            const baseIndices = baseColumns.map(c => beInputData.columns.indexOf(c));
            const matchIndices = matchingCols.map(c => beInputData.columns.indexOf(c));
            const allIndices = [...baseIndices, ...matchIndices];

            const extractedData = beInputData.data.map(row =>
              allIndices.map(idx => row[idx] ?? null)
            );

            outputValue = { columns: extractedColumns, data: extractedData };

            // Update node UI metadata
            setNodes(nds =>
              nds.map(node =>
                node.id === currentId
                  ? {
                    ...node,
                    data: {
                      ...node.data,
                      resolvedBlockCode: beCode || undefined,
                      resolvedSectionType: beType || undefined,
                      extractedColumns: strippedCols,
                      baseColumns,
                      totalInputCols: beInputData.columns.length,
                    },
                  }
                  : node
              )
            );
          }
          break;
        }

        case "DynamicBlockConcatNode": {
          // Resolve sheet name from handle or config
          const dbcSheetNameEdge = incomingEdges.find(e => e.targetHandle === "sheet-name");
          const dbcResolvedSheetName = dbcSheetNameEdge
            ? String(runtimeData.get(`${dbcSheetNameEdge.source}__${dbcSheetNameEdge.sourceHandle}`) ?? runtimeData.get(dbcSheetNameEdge.source) ?? "")
            : "";
          const dbcMasterSheetName = dbcResolvedSheetName || nodeData?.config?.sheetName || 'Master Sheet';

          // Get existing mastersheet data from handle
          const msEdge = incomingEdges.find(e => e.targetHandle === "mastersheet");
          const existingMsData: Dataset = msEdge
            ? (runtimeData.get(`${msEdge.source}__${msEdge.sourceHandle}`) ?? runtimeData.get(msEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };

          // Get code and type from handles
          const codeEdge = incomingEdges.find(e => e.targetHandle === "code");
          const typeEdge = incomingEdges.find(e => e.targetHandle === "type");
          const resolvedCode = codeEdge 
            ? String(runtimeData.get(`${codeEdge.source}__${codeEdge.sourceHandle}`) ?? runtimeData.get(codeEdge.source) ?? "")
            : nodeData?.config?.blockCode ?? "";
          const resolvedType = typeEdge
            ? String(runtimeData.get(`${typeEdge.source}__${typeEdge.sourceHandle}`) ?? runtimeData.get(typeEdge.source) ?? "")
            : nodeData?.config?.sectionType ?? "";

          // Get block data from handle
          const blockEdge = incomingEdges.find(e => e.targetHandle === "block");
          let incomingBlockData: Dataset | null = null;
          if (blockEdge) {
            incomingBlockData = runtimeData.get(`${blockEdge.source}__${blockEdge.sourceHandle}`) ?? runtimeData.get(blockEdge.source);
          }

          // Determine key column — resolve from port, config, or infer from data
          const keyEdge = incomingEdges.find(e => e.targetHandle === "key");
          const resolvedKeyFromPort = keyEdge
            ? String(runtimeData.get(`${keyEdge.source}__${keyEdge.sourceHandle}`) ?? runtimeData.get(keyEdge.source) ?? "")
            : "";
          const dbcKeyCol = resolvedKeyFromPort
            || nodeData?.config?.keyColumn
            || (existingMsData.columns?.length > 0 ? existingMsData.columns.find(c => !c.includes(':')) : '')
            || (incomingBlockData?.columns?.length ? incomingBlockData?.columns?.find((c: string) => !c.includes(':')) : '')
            || '';

          // Determine base columns from existing mastersheet (or defaults if none)
          const baseCols = existingMsData.columns?.length > 0
            ? existingMsData.columns.filter(c => !c.includes(':'))
            : [dbcKeyCol, "Name", "Student_Name", "Student Name", "Roll_No"];

          // If we have code, type, and block data, format the block columns
          let formattedBlockData: Dataset | null = null;
          const prefix = resolvedCode && resolvedType ? `${resolvedCode}:${resolvedType}` : "";
          
          if (incomingBlockData?.columns && prefix) {
            const formattedColumns = incomingBlockData.columns.map(col => {
              // Don't prefix the key column!
              if (col === dbcKeyCol) return col;
              // Don't prefix known base columns
              if (baseCols.includes(col)) return col;
              // If already prefixed with this exact prefix, leave it
              if (col.startsWith(`${prefix}:`)) return col;
              // Otherwise, add the prefix
              // If it has some other prefix, we replace it or prepend? Usually prepend or replace. We'll replace if it has one, or prepend.
              const parts = col.split(':');
              if (parts.length >= 3) {
                // likely already code:type:ColName, replace prefix
                return `${prefix}:${parts.slice(2).join(':')}`;
              }
              return `${prefix}:${col}`;
            });
            formattedBlockData = { columns: formattedColumns, data: incomingBlockData.data };
          } else {
            formattedBlockData = incomingBlockData;
          }

          const dbcBlocks = formattedBlockData ? [formattedBlockData] : [];

          // Apply dynamic block concat
          outputValue = applyDynamicBlockConcat(existingMsData, dbcBlocks, dbcKeyCol);

          // Find if we are replacing an existing block
          const existingCodes: string[] = [];
          if (existingMsData?.columns) {
            for (const col of existingMsData.columns) {
              const parts = col.split(':');
              if (parts.length >= 2) {
                const code = `${parts[0]}:${parts[1]}`;
                if (!existingCodes.includes(code)) existingCodes.push(code);
              }
            }
          }
          const isReplacing = prefix ? existingCodes.includes(prefix) : false;

          // Push to master sheet store for preview
          if (outputValue && outputValue.columns && outputValue.columns.length > 0) {
            try {
              const { useMasterSheetStore } = await import("@/stores/master-sheet-store");
              useMasterSheetStore.getState().pushData({
                masterSheetName: dbcMasterSheetName,
                sheetName: dbcMasterSheetName,
                data: outputValue,
                blockCodenames: prefix ? [prefix] : [],
                pushedBy: 'workflow',
                pushedByName: 'Workflow Execution',
                pushedAt: Date.now(),
                sourceNodeId: currentId,
              });
            } catch (e) {
              console.warn("Could not push to master sheet store:", e);
            }
          }

          // Update node with metadata
          setNodes(nds =>
            nds.map(node =>
              node.id === currentId
                ? {
                  ...node,
                  data: {
                    ...node.data,
                    mastersheetColumns: existingMsData.columns ?? [],
                    blockColumns: incomingBlockData?.columns ?? [],
                    resolvedSheetName: dbcResolvedSheetName || undefined,
                    resolvedKeyColumn: dbcKeyCol || undefined,
                    resolvedBlockCode: resolvedCode || undefined,
                    resolvedSectionType: resolvedType || undefined,
                    isReplacing,
                    hasMastersheet: existingMsData.columns?.length > 0,
                  },
                }
                : node
            )
          );
          break;
        }

        // ── Desk panel nodes ──────────────────────────
        case "DeskTextInputNode": {
          // Read value from desk store (block-scoped)
          try {
            const { useDeskStore } = await import("@/stores/desk-store");
            const deskBlockId = nodeData?.deskBlockId;
            const deskInputId = nodeData?.deskInputId;
            let val = "";
            if (deskBlockId && deskInputId) {
              const input = useDeskStore.getState().getTextInputById(deskBlockId, deskInputId);
              outputValue = input?.value ?? nodeData?.text ?? "";
            } else {
              outputValue = nodeData?.text ?? "";
            }
          } catch {
            outputValue = nodeData?.text ?? "";
          }
          break;
        }

        case "ActionButtonNode": {
          // Read triggered state from desk store
          try {
            const { useDeskStore } = await import("@/stores/desk-store");
            const deskBlockId = nodeData?.deskBlockId;
            const actionId = nodeData?.actionId;
            let triggered = false;
            if (deskBlockId && actionId) {
              const block = useDeskStore.getState().blocks.find(b => b.id === deskBlockId);
              triggered = block?.actionButtons?.find(a => a.id === actionId)?.triggered ?? false;
            }
            outputValue = triggered;
          } catch (e) {
            outputValue = false;
          }
          break;
        }

        case "DeskSheetNode": {
          // Read sheet data from desk store (block-scoped)
          try {
            const { useDeskStore } = await import("@/stores/desk-store");
            const deskBlockId = nodeData?.deskBlockId;
            const deskSheetId = nodeData?.deskSheetId;
            if (deskBlockId && deskSheetId) {
              const sheet = useDeskStore.getState().getSheetById(deskBlockId, deskSheetId);
              if (sheet?.data) {
                outputValue = sheet.data as Dataset;
              } else {
                outputValue = nodeData?.text ?? { columns: [], data: [] };
              }
            } else {
              const fileData = nodeData?.text;
              if (fileData && typeof fileData === "object" && fileData.columns) {
                outputValue = fileData as Dataset;
              } else {
                outputValue = { columns: [], data: [] };
              }
            }
          } catch {
            outputValue = nodeData?.text ?? { columns: [], data: [] };
          }
          break;
        }

        case "OutputPreviewNode": {
          // Push result to desk store for Syncfusion preview (block-scoped)
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = ds;
          if (ds && ds.columns && ds.columns.length > 0) {
            try {
              const { useDeskStore } = await import("@/stores/desk-store");
              const deskBlockId = nodeData?.deskBlockId;
              if (deskBlockId) {
                useDeskStore.getState().setBlockOutput(deskBlockId, ds);
              }
            } catch (e) {
              console.warn("Could not push to desk store:", e);
            }
          }
          break;
        }

        case "MasterSheetPreviewNode": {
          // Input edge — try named "in" handle first, then any unnamed edge, then generic inputValue
          const dataEdge = incomingEdges.find((e: any) => e.targetHandle === "in")
            || incomingEdges.find((e: any) => !e.targetHandle || e.targetHandle === null);
          const msDs: Dataset = dataEdge
            ? (runtimeData.get(`${dataEdge.source}__${dataEdge.sourceHandle}`) ?? runtimeData.get(dataEdge.source) ?? inputValue ?? { columns: [], data: [] })
            : (inputValue ?? { columns: [], data: [] });

          // Save trigger edge
          const saveEdge = incomingEdges.find((e: any) => e.targetHandle === "save-trigger");
          const saveTriggered = saveEdge
            ? Boolean(runtimeData.get(`${saveEdge.source}__${saveEdge.sourceHandle}`) ?? runtimeData.get(saveEdge.source))
            : false;

          outputValue = msDs;
          let saveStatus = '';

          if (msDs && msDs.columns && msDs.columns.length > 0) {
            try {
              const { useDeskStore } = await import("@/stores/desk-store");
              useDeskStore.getState().setMasterSheetPreview(msDs);
            } catch (e) {
              console.warn("Could not push to master sheet:", e);
            }

            if (saveTriggered) {
              try {
                // Determine sheet name from node data or fallback
                const sheetName = nodeData?.mastersheetId || 'Master Sheet';
                // Try to get user info from next-auth if possible, but in this context we might need to rely on the server action picking it up or the store having it.
                const { upsertMasterSheetByName } = await import("@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions");
                
                // Try to extract userId from clerk global object or fallback to an empty string.
                // In a true environment, the server action would use auth() internally, but since the signature requires it, we pass it.
                // It might fail if userId is strictly validated, but since this runs on client-side, we can get it from Clerk.
                const userId = (window as any).Clerk?.user?.id || nodeData?.userId || "";
                
                if (userId) {
                  await upsertMasterSheetByName({ name: sheetName, data: msDs, userId });
                  saveStatus = 'saved';
                } else {
                  saveStatus = 'error (no user id)';
                }
              } catch (err) {
                console.error("Failed to save mastersheet:", err);
                saveStatus = 'error';
              }
            }
          }

          // Update node UI
          setNodes(nds =>
            nds.map(node =>
              node.id === currentId
                ? {
                  ...node,
                  data: {
                    ...node.data,
                    saveTriggered,
                    lastSaveStatus: saveStatus || node.data.lastSaveStatus,
                  },
                }
                : node
            )
          );
          break;
        }

        case "OutputNode2":
        case "baseOutput":
        case "FileOutputNode":
          outputValue = inputValue;
          break;

        case "TrueFalseNode": {
          // Read checkbox state from desk store
          try {
            const { useDeskStore } = await import("@/stores/desk-store");
            const deskBlockId = nodeData?.deskBlockId;
            const checkboxId = nodeData?.checkboxId || currentId;
            if (deskBlockId) {
              const block = useDeskStore.getState().blocks.find(b => b.id === deskBlockId);
              const field = block?.checkboxFields.find(f => f.id === checkboxId);
              outputValue = field?.checked ?? false;
            } else {
              outputValue = false;
            }
          } catch {
            outputValue = false;
          }
          break;
        }

        case "BlockOutputSenderNode": {
          // Store input data as block output for the next block
          const ds: Dataset = inputValue ?? { columns: [], data: [] };
          outputValue = ds;
          if (ds && ds.columns && ds.columns.length > 0) {
            try {
              const { useDeskStore } = await import("@/stores/desk-store");
              const deskBlockId = nodeData?.deskBlockId;
              if (deskBlockId) {
                useDeskStore.getState().setBlockOutput(deskBlockId, ds);
              }
            } catch (e) {
              console.warn("Could not push to desk store:", e);
            }
          }
          break;
        }

        default:
          outputValue = inputValue;
          break;
      }
    } catch (err: any) {
      console.error(`Error processing node ${currentNode.type}:`, err);
      setNodes((nds) =>
        nds.map((node) =>
          node.id === currentId
            ? {
                ...node,
                data: {
                  ...node.data,
                  error: err?.message ?? "Processing error",
                },
              }
            : node
        )
      );
      outputValue = inputValue; // pass through on error
    }

    if (currentNode.type === "IfElseNode" || currentNode.type === "SwitchCaseNode") {
      // outputValue is Record<string, Dataset> mapping handle ID to Dataset
      if (outputValue && typeof outputValue === "object") {
        for (const handleId in outputValue) {
          runtimeData.set(`${currentId}__${handleId}`, outputValue[handleId]);
        }
      }
    } else {
      runtimeData.set(currentId, outputValue);
      // Fallback for single-handle output edges checking specific handles
      runtimeData.set(`${currentId}__out`, outputValue);
    }

    // Update node's result + propagate column info to downstream nodes
    const isDataset =
      outputValue &&
      typeof outputValue === "object" &&
      Array.isArray(outputValue.columns);

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === currentId) {
          return {
            ...node,
            data: {
              ...node.data,
              result: outputValue,
              rowCount: isDataset ? outputValue.data.length : undefined,
            },
          };
        }

        // Propagate inputColumns to downstream nodes
        const isChild = edges.some(
          (e) => e.source === currentId && e.target === node.id
        );
        if (isChild && isDataset) {
          return {
            ...node,
            data: {
              ...node.data,
              inputColumns: outputValue.columns,
            },
          };
        }

        return node;
      })
    );

    // Decrease in-degree of children → add to queue
    graph.get(currentId)!.forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }
};

// ────────────────────────────────────────────────
// Inner workflow execution — non-stateful, used by SubflowNode
// Returns a map of nodeId → outputValue
// ────────────────────────────────────────────────
async function executeInnerWorkflow(
  innerNodes: any[],
  innerEdges: any[],
  inputDataMap: Map<string, any>
): Promise<Map<string, any>> {
  const runtimeData = new Map<string, any>();

  // Build graph
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  innerNodes.forEach((node: any) => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  innerEdges.forEach((edge: any) => {
    graph.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Start with source nodes (no incoming)
  const queue = innerNodes
    .filter((n: any) => inDegree.get(n.id) === 0)
    .map((n: any) => n.id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = innerNodes.find((n: any) => n.id === currentId);
    if (!currentNode) continue;

    const incomingEdges = innerEdges.filter((e: any) => e.target === currentId);
    let inputValue: any = null;

    if (incomingEdges.length === 1) {
      const e = incomingEdges[0];
      inputValue = runtimeData.get(`${e.source}__${e.sourceHandle}`) ?? runtimeData.get(e.source) ?? null;
    }

    let outputValue: any = inputValue;
    const nodeData = currentNode.data || {};

    try {
      switch (currentNode.type) {
        // Boundary input: inject data from the parent SubflowNode
        case "WorkflowInputNode": {
          outputValue = inputDataMap.get(currentId) ?? { columns: [], data: [] };
          break;
        }

        // Boundary output: pass-through
        case "WorkflowOutputNode": {
          outputValue = inputValue ?? { columns: [], data: [] };
          break;
        }

        // Data input nodes
        case "InputFileNode":
        case "SpreadsheetInputNode":
        case "DataLibraryInputNode": {
          const fileData = nodeData?.text;
          if (fileData && typeof fileData === "object" && fileData.columns) {
            outputValue = fileData as Dataset;
          } else {
            outputValue = { columns: [], data: [] };
          }
          break;
        }

        case "TextInputNode":
          outputValue = nodeData?.text ?? "";
          break;

        // Transform nodes
        case "FilterNode":
          outputValue = applyFilter(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "MathColumnNode":
          outputValue = applyMathColumn(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "MathRowNode":
          outputValue = applyMathRow(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "SortNode":
          outputValue = applySort(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "AggregateNode":
          outputValue = applyAggregate(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "CountNode":
          outputValue = applyCountInRow(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "FormulaNode":
          outputValue = applyFormula(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "RenameColumnNode":
          outputValue = applyRenameColumn(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "SelectColumnsNode":
          outputValue = applySelectColumns(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "ColumnMapNode":
          outputValue = applyColumnMap(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "DropColumnNode":
          outputValue = applyDropColumns(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "CamelCaseNode":
          outputValue = typeof inputValue === "string" ? toCamelCase(inputValue) : toCamelCase(String(JSON.stringify(inputValue) ?? ""));
          break;

        case "LowercaseNode":
          outputValue = typeof inputValue === "string" ? toLowercase(inputValue) : toLowercase(String(JSON.stringify(inputValue) ?? ""));
          break;

        case "IfElseNode":
          outputValue = applyIfElse(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        case "SwitchCaseNode":
          outputValue = applySwitchCase(inputValue ?? { columns: [], data: [] }, nodeData?.config ?? {});
          break;

        // Merge nodes
        case "MergeNode": {
          const leftEdge = incomingEdges.find((e: any) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e: any) => e.targetHandle === "right");
          const leftData = leftEdge ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          const rightData = rightEdge ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          outputValue = applyMerge(leftData, rightData, nodeData?.config ?? {});
          break;
        }

        case "UnionMergeNode": {
          const leftEdge = incomingEdges.find((e: any) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e: any) => e.targetHandle === "right");
          const leftData = leftEdge
            ? (runtimeData.get(`${leftEdge.source}__${leftEdge.sourceHandle}`) ?? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          const rightData = rightEdge
            ? (runtimeData.get(`${rightEdge.source}__${rightEdge.sourceHandle}`) ?? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };
          outputValue = applyUnionMerge(leftData, rightData, nodeData?.config ?? {});
          break;
        }

        case "AppendNode": {
          const leftEdge = incomingEdges.find((e: any) => e.targetHandle === "left");
          const rightEdge = incomingEdges.find((e: any) => e.targetHandle === "right");
          const topData = leftEdge ? runtimeData.get(leftEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          const bottomData = rightEdge ? runtimeData.get(rightEdge.source) ?? { columns: [], data: [] } : { columns: [], data: [] };
          outputValue = applyAppend(topData, bottomData, nodeData?.config ?? {});
          break;
        }

        case "SubjectBlockNode": {
          const subjectCodeEdge = incomingEdges.find((e: any) => e.targetHandle === "subject-code");
          const sectionTypeEdge = incomingEdges.find((e: any) => e.targetHandle === "section-type");
          const keyColNameEdge = incomingEdges.find((e: any) => e.targetHandle === "key-col-name");
          const dataEdge = incomingEdges.find((e: any) => e.targetHandle === "data");
          const subjectCode = subjectCodeEdge ? String(runtimeData.get(subjectCodeEdge.source) ?? "") : nodeData?.config?.subjectCode ?? "";
          const sectionType = sectionTypeEdge ? String(runtimeData.get(sectionTypeEdge.source) ?? "") : nodeData?.config?.sectionType ?? "";
          const keyColName = keyColNameEdge ? String(runtimeData.get(keyColNameEdge.source) ?? "") : nodeData?.config?.keyColumnName ?? "";
          const blockDataIn: Dataset = dataEdge ? (runtimeData.get(dataEdge.source) ?? { columns: [], data: [] }) : { columns: [], data: [] };
          outputValue = applySubjectBlock(blockDataIn, subjectCode, sectionType, keyColName);
          break;
        }

        case "BlockConcatNode": {
          const baseEdge = incomingEdges.find((e: any) => e.targetHandle === "base");
          const baseDataIn: Dataset = baseEdge ? (runtimeData.get(baseEdge.source) ?? { columns: [], data: [] }) : { columns: [], data: [] };
          const blocksIn: Dataset[] = [];
          for (let i = 0; i < 8; i++) {
            const be = incomingEdges.find((e: any) => e.targetHandle === `block-${i}`);
            if (be) { const bd = runtimeData.get(be.source); if (bd?.columns) blocksIn.push(bd); }
          }
          const kcIn = nodeData?.config?.keyColumn ?? baseDataIn.columns[0] ?? "";
          outputValue = applyBlockConcat(baseDataIn, blocksIn, kcIn);
          break;
        }

        case "MasterSheetLibraryNode": {
          const fileData = (currentNode.data as any)?.text;
          if (fileData && typeof fileData === "object" && fileData.columns) {
            outputValue = fileData as Dataset;
          } else {
            outputValue = { columns: [], data: [] };
          }
          break;
        }

        case "BlockExtractorNode": {
          const beDataEdge = incomingEdges.find((e: any) => e.targetHandle === "data");
          const beInputData: Dataset = beDataEdge
            ? (runtimeData.get(`${beDataEdge.source}__${beDataEdge.sourceHandle}`) ?? runtimeData.get(beDataEdge.source) ?? { columns: [], data: [] })
            : (inputValue ?? { columns: [], data: [] });
          const beCodeEdge = incomingEdges.find((e: any) => e.targetHandle === "code");
          const beTypeEdge = incomingEdges.find((e: any) => e.targetHandle === "type");
          const beCodeRaw = beCodeEdge ? String(runtimeData.get(`${beCodeEdge.source}__${beCodeEdge.sourceHandle}`) ?? runtimeData.get(beCodeEdge.source) ?? "") : nodeData?.config?.blockCode ?? "";
          const beTypeRaw = beTypeEdge ? String(runtimeData.get(`${beTypeEdge.source}__${beTypeEdge.sourceHandle}`) ?? runtimeData.get(beTypeEdge.source) ?? "") : nodeData?.config?.sectionType ?? "";
          const beCode = beCodeRaw.trim();
          const beType = beTypeRaw.trim();
          const bePrefix = beCode && beType ? `${beCode}:${beType}:` : "";
          const bePrefixLower = bePrefix.toLowerCase();
          
          if (!bePrefix || !beInputData?.columns?.length) {
            outputValue = { columns: [], data: [] };
          } else {
            const baseColumns = beInputData.columns.filter(c => !c.includes(':'));
            const matchingCols = beInputData.columns.filter(c => c.toLowerCase().startsWith(bePrefixLower));
            const strippedCols = matchingCols.map(c => {
              const lowerC = c.toLowerCase();
              return lowerC.startsWith(bePrefixLower) ? c.slice(bePrefix.length) : c;
            });
            const extractedColumns = [...baseColumns, ...strippedCols];
            const baseIndices = baseColumns.map(c => beInputData.columns.indexOf(c));
            const matchIndices = matchingCols.map(c => beInputData.columns.indexOf(c));
            const allIndices = [...baseIndices, ...matchIndices];
            outputValue = { columns: extractedColumns, data: beInputData.data.map(row => allIndices.map(idx => row[idx] ?? null)) };
          }
          break;
        }

        case "DynamicBlockConcatNode": {
          const dbcMsEdge = incomingEdges.find((e: any) => e.targetHandle === "mastersheet");
          const dbcExistingData: Dataset = dbcMsEdge
            ? (runtimeData.get(`${dbcMsEdge.source}__${dbcMsEdge.sourceHandle}`) ?? runtimeData.get(dbcMsEdge.source) ?? { columns: [], data: [] })
            : { columns: [], data: [] };

          const codeEdge = incomingEdges.find((e: any) => e.targetHandle === "code");
          const typeEdge = incomingEdges.find((e: any) => e.targetHandle === "type");
          const resolvedCode = codeEdge 
            ? String(runtimeData.get(`${codeEdge.source}__${codeEdge.sourceHandle}`) ?? runtimeData.get(codeEdge.source) ?? "")
            : nodeData?.config?.blockCode ?? "";
          const resolvedType = typeEdge
            ? String(runtimeData.get(`${typeEdge.source}__${typeEdge.sourceHandle}`) ?? runtimeData.get(typeEdge.source) ?? "")
            : nodeData?.config?.sectionType ?? "";

          const blockEdge = incomingEdges.find((e: any) => e.targetHandle === "block");
          let incomingBlockData: Dataset | null = null;
          if (blockEdge) {
            incomingBlockData = runtimeData.get(`${blockEdge.source}__${blockEdge.sourceHandle}`) ?? runtimeData.get(blockEdge.source);
          }

          // Key from port, config, or infer
          const keyEdge = incomingEdges.find((e: any) => e.targetHandle === "key");
          const resolvedKeyInner = keyEdge
            ? String(runtimeData.get(`${keyEdge.source}__${keyEdge.sourceHandle}`) ?? runtimeData.get(keyEdge.source) ?? "")
            : "";
          const dbcKc = resolvedKeyInner
            || nodeData?.config?.keyColumn
            || (dbcExistingData.columns?.length > 0 ? dbcExistingData.columns.find(c => !c.includes(':')) : '')
            || (incomingBlockData?.columns?.length ? incomingBlockData?.columns?.find((c: string) => !c.includes(':')) : '')
            || '';
          const baseCols = dbcExistingData.columns?.length > 0
            ? dbcExistingData.columns.filter(c => !c.includes(':'))
            : [dbcKc, "Name", "Student_Name", "Student Name", "Roll_No"];

          let formattedBlockData: Dataset | null = null;
          const prefix = resolvedCode && resolvedType ? `${resolvedCode}:${resolvedType}` : "";
          if (incomingBlockData?.columns && prefix) {
            const formattedColumns = incomingBlockData.columns.map(col => {
              if (col === dbcKc) return col;
              if (baseCols.includes(col)) return col;
              if (col.startsWith(`${prefix}:`)) return col;
              const parts = col.split(':');
              if (parts.length >= 3) return `${prefix}:${parts.slice(2).join(':')}`;
              return `${prefix}:${col}`;
            });
            formattedBlockData = { columns: formattedColumns, data: incomingBlockData.data };
          } else {
            formattedBlockData = incomingBlockData;
          }

          const dbcBlocksInner = formattedBlockData ? [formattedBlockData] : [];
          outputValue = applyDynamicBlockConcat(dbcExistingData, dbcBlocksInner, dbcKc);
          break;
        }

        default:
          outputValue = inputValue;
          break;
      }
    } catch (err: any) {
      console.error(`Inner workflow error on node ${currentNode.type}:`, err);
      outputValue = inputValue;
    }

    // Store output
    if (currentNode.type === "IfElseNode" || currentNode.type === "SwitchCaseNode") {
      if (outputValue && typeof outputValue === "object") {
        for (const handleId in outputValue) {
          runtimeData.set(`${currentId}__${handleId}`, outputValue[handleId]);
        }
      }
    } else {
      runtimeData.set(currentId, outputValue);
      runtimeData.set(`${currentId}__out`, outputValue);
      // Also set for workflow-input specific handles
      if (currentNode.type === "WorkflowInputNode") {
        runtimeData.set(`${currentId}__wf-input-${currentId}`, outputValue);
      }
    }

    // Decrease in-degree of children → add to queue
    graph.get(currentId)?.forEach((childId) => {
      inDegree.set(childId, (inDegree.get(childId) || 0) - 1);
      if (inDegree.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }

  return runtimeData;
}
