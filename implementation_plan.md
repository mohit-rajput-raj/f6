# ReactFlow Data Processing Workflow System

Build a production-quality node-based data processing pipeline where connecting nodes triggers **instant data propagation** (a→b→c, connecting any edge recalculates the full graph). Includes rich calculation nodes (math, filter, sort, aggregate, formula), file I/O nodes bridged to the Syncfusion spreadsheet, and a FastAPI backend for heavy computations.

## User Review Required

> [!IMPORTANT]
> **Scope decision**: This plan focuses on the **workflow engine, calculation nodes, and undo/redo fixes**. The spreadsheet ↔ workflow bridge will be a functional two-way link. Should I prioritize any specific calculation type (e.g., more text operations vs. more math operations)?

> [!WARNING]  
> **Breaking change**: The [WorkFlowContextProvider](file:///d:/vscodes/turborepo/f6/apps/dashboard/context/WorkFlowContextProvider.tsx#164-183) will be significantly reworked. The current `state.editor.elements` / `nodes` dual-source-of-truth pattern will be consolidated — `nodes` and `edges` from `useState` will be the single source of truth, and history will snapshot them on meaningful changes.

---

## Proposed Changes

### 1. Core Infrastructure — WorkFlowContextProvider

#### [MODIFY] [WorkFlowContextProvider.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/context/WorkFlowContextProvider.tsx)

**Problem**: Undo/redo never works because no action ever pushes to `history`. The reducer has `UNDO`/`REDO` cases but nothing ever dispatches an action that adds to the history array. Also, `nodes`/`edges` useState and `state.editor.elements` are out of sync.

**Fix**:
- Remove the broken reducer-based history system
- Add a proper `useRef`-based undo/redo history that snapshots `{nodes, edges}` on meaningful changes
- Expose `undo()`, `redo()`, `pushHistory()` from context
- Remove `state`/[dispatch](file:///d:/vscodes/turborepo/f6/apps/dashboard/context/WorkFlowContextProvider.tsx#153-154) — replace with clean `nodes`/`edges` as single source of truth
- Add `executeGraph()` function that runs the execution engine automatically when edges/nodes change

---

### 2. Reactive Execution Engine

#### [MODIFY] [nodeExecutions.ts](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/executions/nodeExecutions.ts)

- Update the topological sort execution to handle all new node types
- Add new cases: `MathColumnNode`, `MathRowNode`, `SortNode`, `AggregateNode`, `FormulaNode`, `MergeNode`, `RenameColumnNode`, `SelectColumnsNode`, `FileOutputNode`
- For heavy operations (formula, large dataset math), call FastAPI backend via axios
- For simple operations (rename, select, text transforms), compute client-side

#### [MODIFY] [functions.ts](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/executions/functions.ts)

- Add computation functions: `applyMathColumn`, `applyMathRow`, `applySort`, `applyAggregate`, `applyFormula`, `applyMerge`, `applyRename`, `applySelectColumns`

---

### 3. FastAPI Backend — New Endpoints

#### [MODIFY] [main.py](file:///d:/vscodes/turborepo/f6/apps/pyp/main.py)

Add new endpoints:
- `POST /calculate` — column/row math operations (body: JSON data + operation config)
- `POST /transform` — text transforms, sort, aggregate on JSON data
- `POST /formula` — evaluate custom formulas using pandas `eval()`

#### [NEW] [calculation_service.py](file:///d:/vscodes/turborepo/f6/apps/pyp/app/services/calculation_service.py)

Service functions for all math/transform operations using pandas.

---

### 4. New Calculation Nodes (all in `calcy-nodes/`)

#### [NEW] [math-column-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/math-column-node.tsx)

Column math: select a column, choose operation (add/sub/mul/div), enter value or select another column. UI: dropdowns for column + operation + value input.

#### [NEW] [math-row-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/math-row-node.tsx)

Row aggregation: select multiple columns, choose aggregation (sum/avg/min/max). Creates a new column with the result.

#### [NEW] [sort-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/sort-node.tsx)

Sort dataset by column, ascending or descending.

#### [NEW] [aggregate-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/aggregate-node.tsx)

Group by a column and aggregate another (sum/count/avg/min/max).

#### [NEW] [formula-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/formula-node.tsx)

Custom formula: user types an expression like `col_A * 2 + col_B`. Sent to FastAPI for pandas `eval()`.

#### [NEW] [merge-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/merge-node.tsx)

Two inputs (left/right), select join type (inner/left/right/outer) and join column. Outputs merged dataset.

#### [NEW] [rename-column-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/rename-column-node.tsx)

Rename a column. Dropdown for existing column + text input for new name.

#### [NEW] [select-columns-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/calcy-nodes/select-columns-node.tsx)

Pick or drop specific columns from the dataset.

---

### 5. Improved I/O Nodes

#### [MODIFY] [inputfile.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/input-nodes/inputfile.tsx)

- Upload file → parse via FastAPI → store as `{columns, data}` in node data
- **Also load the file into the Syncfusion spreadsheet** via `spreadsheetRef.current.open()`
- Show column preview and row count on the node

#### [NEW] [file-output-node.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/output-nodes/file-output-node.tsx)

- Receives computed `{columns, data}` from upstream
- Updates Syncfusion spreadsheet with the result data
- Has "Download as CSV/XLSX" button
- Shows preview (row count, first few rows)

#### [MODIFY] [textoutput.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/nodes/output-nodes/textoutput.tsx)

- Display tabular data nicely when result is `{columns, data}` format

---

### 6. Spreadsheet Bridge

#### [MODIFY] [syncSheet.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/components/dashboard/sheet/syncSheet.tsx)

- Expose `spreadsheetRef` through a shared context/store so workflow nodes can read/write
- Add function to load `{columns, data}` into a new sheet

#### [NEW] [spreadsheet-store.ts](file:///d:/vscodes/turborepo/f6/apps/dashboard/stores/spreadsheet-store.ts)

Zustand store to bridge spreadsheet data with workflow:
- `sheetData: {columns, data}[]` — tracked sheet datasets
- `loadDataIntoSheet(name, columns, data)` — called by FileOutputNode
- `getSheetData(name)` — called by InputFileNode

---

### 7. UI Updates

#### [MODIFY] [tabs.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/tabs.tsx)

Add all new nodes to the node panel under organized categories:
- **Input**: File, Text, Image
- **Transform**: Filter, Sort, Rename Column, Select Columns, Uppercase, Lowercase, CamelCase
- **Math**: Math Column, Math Row, Formula, Aggregate
- **Combine**: Merge
- **Output**: Text Output, File Output, Display

#### [MODIFY] [reactFlow.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/reactFlow.tsx)

Register all new node types in `nodeTypess` memo.

#### [MODIFY] [types.ts](file:///d:/vscodes/turborepo/f6/apps/dashboard/lib/types.ts)

Add new [EditorCanvasTypes](file:///d:/vscodes/turborepo/f6/apps/dashboard/lib/types.ts#110-132): `MathColumnNode`, `MathRowNode`, `SortNode`, `AggregateNode`, `FormulaNode`, `MergeNode`, `RenameColumnNode`, `SelectColumnsNode`, `FileOutputNode`

#### [MODIFY] [nodes-desp.ts](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/constants/nodes-desp.ts)

Add descriptions for all new node types.

#### [MODIFY] [resizable.tsx](file:///d:/vscodes/turborepo/f6/apps/dashboard/app/%5Bproject%5D/dash/%5Bdashid%5D/editor/_components/resizable.tsx)

Update toolbar: replace old [dispatch({type: "UNDO"})](file:///d:/vscodes/turborepo/f6/apps/dashboard/context/WorkFlowContextProvider.tsx#153-154) with new `undo()`/`redo()` from context.

---

## Verification Plan

### Manual Verification (User Testing in Browser)

Since there are no existing tests in the project, verification will be done manually in the browser:

1. **Start the dev server**: `cd d:\vscodes\turborepo\f6 && pnpm dev` (starts Next.js on port 3002)
2. **Start FastAPI**: `cd d:\vscodes\turborepo\f6\apps\pyp && python -m uvicorn main:app --reload`
3. **Navigate** to an editor page: `http://localhost:3002/[project]/dash/[dashid]/editor`
4. **Test node creation**: Click each node type from the right panel — verify they appear on canvas
5. **Test data flow**: 
   - Add an InputFile node → upload a `.xlsx` file
   - Connect to a Filter node → configure filter → verify row count updates instantly
   - Connect to a MathColumn node → add 10 to a column → verify data updates
   - Connect to FileOutputNode → verify the spreadsheet updates with result data
6. **Test undo/redo**: Make changes (add nodes, connect edges, configure) → click undo → verify state reverts → click redo → verify state restores
7. **Test spreadsheet bridge**: Upload a file in InputFile → check it appears in the bottom spreadsheet tab. View FileOutputNode result in spreadsheet.

> [!NOTE]
> Could you confirm which port your FastAPI runs on (I assumed 8000 based on your axios config) and whether I should start with all nodes or a smaller subset first?
