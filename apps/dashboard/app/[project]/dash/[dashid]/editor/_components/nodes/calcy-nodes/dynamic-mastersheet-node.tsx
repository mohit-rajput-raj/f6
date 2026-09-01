"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, Table2, Key, Save, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/components";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { useMasterSheetStore } from "@/stores/master-sheet-store";
import { useSession } from "@/lib/auth-client";
import { getUserLLMKeys, saveUserLLMKeys } from "@/app/[project]/dash/[dashid]/(documents)/data-library/api-key-actions";
import { upsertMasterSheetByName, addMasterSheetHistory } from "@/app/[project]/dash/[dashid]/(documents)/data-library/master-sheet-actions";
import { useDynamicAlignSchema } from "../../../_actions/editor.queryes";
import { toast } from "sonner";
import { NodeMenu } from "../node-menu";
import { IconTrash } from "@tabler/icons-react";
import { useDeleteNode } from "../settings/triggers";

export function DynamicMasterSheetNode({ id, data }: any) {
  const { setNodes } = useReactFlow();
  const { data: sessionData } = useSession();
  const userId = sessionData?.user?.id;
  const userName = sessionData?.user?.name ?? "User";

  const sheetsObj = useMasterSheetStore((s) => s.sheets);
  const activeSheetNameStore = useMasterSheetStore((s) => s.activeSheetName);

  // Dynamically extract ALL sheet tabs from MasterSheet store & connected input nodes
  const getAvailableSheets = (): string[] => {
    const list = new Set<string>();

    // 1. Check connected node fileData / spreadsheet input
    if (Array.isArray(data?.fileData?.sheetNames)) {
      data.fileData.sheetNames.forEach((n: string) => list.add(n));
    }
    if (Array.isArray(data?.sheetNames)) {
      data.sheetNames.forEach((n: string) => list.add(n));
    }

    // 2. Check master-sheet-store sheets & internal workbook tabs (FortuneSheet / JSON structure)
    Object.keys(sheetsObj).forEach((key) => {
      list.add(key);
      const entry = sheetsObj[key];
      const raw = entry?.data;
      if (raw) {
        const wb = (raw as any).Workbook || raw;
        const sheetsArr = (wb as any).sheets || (raw as any).sheets;
        if (Array.isArray(sheetsArr)) {
          sheetsArr.forEach((s: any) => {
            if (s?.name) list.add(s.name);
          });
        }
      }
    });

    return Array.from(list);
  };

  const availableSheets = getAvailableSheets();

  const handleDelete = useDeleteNode();

  // Accept sheet name from connected DeskTextInput handle or fallback to local state
  const effectiveSheetName = data?.incomingSheetName || data?.selectedSheet || activeSheetNameStore || availableSheets[0] || "Sheet1";

  const HARDCODED_DEFAULT_PROMPT =
    "Match Enrollment ID in column 1. Calculate present count and update total and attended classes for target path.";

  const [selectedSheet, setSelectedSheet] = useState<string>(
    effectiveSheetName
  );
  const [targetPath, setTargetPath] = useState<string>(
    data?.targetPath || "CO24554/Th."
  );
  const [customPrompt, setCustomPrompt] = useState<string>(
    data?.customPrompt || HARDCODED_DEFAULT_PROMPT
  );
  const [apiKey, setApiKey] = useState<string>(data?.apiKey || "");
  const [provider, setProvider] = useState<string>(data?.provider || "gemini");
  const [model, setModel] = useState<string>(data?.model || "gemini-2.5-flash");
  
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySavedSuccess, setKeySavedSuccess] = useState(false);

  const [computedUpdates, setComputedUpdates] = useState<any[]>(data?.updates || []);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [typePass , setTypePass] = useState<boolean>(true)
  // TanStack Query Mutation (using Axios backend call)
  const alignMutation = useDynamicAlignSchema();

  // Auto-load API key from DB or localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const localKey = localStorage.getItem(`${provider.toUpperCase()}_API_KEY`);
      if (localKey && !apiKey) setApiKey(localKey);
    }
    if (userId) {
      getUserLLMKeys(userId)
        .then((keys) => {
          if (provider === "gemini" && keys.geminiApiKey && !apiKey) setApiKey(keys.geminiApiKey);
          if (provider === "openai" && keys.openaiApiKey && !apiKey) setApiKey(keys.openaiApiKey);
          if (provider === "claude" && keys.claudeApiKey && !apiKey) setApiKey(keys.claudeApiKey);
        })
        .catch(console.warn);
    }
  }, [userId, provider]);

  // Sync state changes back to ReactFlow node data
  const updateNodeData = (field: string, value: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              [field]: value,
            },
          };
        }
        return n;
      })
    );
  };

  const handleSaveApiKey = async () => {
    if (!apiKey || !apiKey.trim()) {
      toast.error("Please enter a valid API Key to save.");
      return;
    }
    setIsSavingKey(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`${provider.toUpperCase()}_API_KEY`, apiKey.trim());
      }
      if (userId) {
        await saveUserLLMKeys(userId, {
          [provider === "gemini" ? "geminiApiKey" : provider === "openai" ? "openaiApiKey" : "claudeApiKey"]: apiKey.trim(),
        });
      }
      setKeySavedSuccess(true);
      toast.success("API Key saved to your account successfully!");
      setTimeout(() => setKeySavedSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save API Key: " + (err.message || err));
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleAlign = async () => {
    if (!apiKey || !apiKey.trim()) {
      toast.error("API Key is required. Please enter your Gemini/OpenAI API key below.");
      return;
    }

    const effectivePath = data?.incomingTargetPath || targetPath || "CO24554/th";
    const effectiveSheet = data?.incomingSheetName || selectedSheet || "Sheet1";

    // 1. Resolve master grid (store -> desk store -> fallback)
    const store = useMasterSheetStore.getState();
    const deskStore = (await import("@/stores/desk-store")).useDeskStore.getState();
    const { extract2DGridFromAnySheet, applyComputedUpdatesToGrid } = await import("@/lib/sheet-utils");

    let currentSheetRaw = store.sheets[effectiveSheet]?.data || deskStore.activeMasterSheetData || deskStore.masterSheetPreview || data?.masterGrid?.data || data?.masterGrid;
    let { columns: masterCols, data: masterRows } = extract2DGridFromAnySheet(currentSheetRaw);

    if (masterCols.length === 0) {
      masterCols = ["S.No", "Enrollment", "Name", `${effectivePath}:Total`, `${effectivePath}:Attended`, `${effectivePath}:%`];
      masterRows = [];
    }

    const masterGrid = [masterCols, ...masterRows];

    // 2. Resolve CSV input data
    const csvContent = data?.csvContent || data?.fileData?.rawText || data?.dataInput || data?.text;
    let csvString = typeof csvContent === "string" ? csvContent : "";
    if (!csvString && typeof csvContent === "object" && csvContent !== null) {
      if (Array.isArray(csvContent.columns) && Array.isArray(csvContent.data)) {
        const headers = csvContent.columns.join(",");
        const rows = csvContent.data.map((r: any[]) => (Array.isArray(r) ? r.join(",") : String(r))).join("\n");
        csvString = `${headers}\n${rows}`;
      } else if (Array.isArray(csvContent.data)) {
        csvString = JSON.stringify(csvContent.data);
      }
    }

    if (!csvString) {
      toast.error("Missing input dataset or CSV data on input handle.");
      return;
    }

    const effectivePrompt = data?.incomingCustomPrompt || customPrompt || "Match Enrollment ID in column 1. Calculate present count and update total and attended classes for target path.";

    alignMutation.mutate(
      {
        master_grid: masterGrid,
        csv_string: csvString,
        target_column_path: effectivePath,
        custom_prompt: effectivePrompt,
        sheet_name: effectiveSheet,
        provider: provider,
        api_key: apiKey.trim(),
        model: model || "gemini-2.5-flash",
      },
      {
        onSuccess: (res: any) => {
          if (res?.success && Array.isArray(res.updates)) {
            setComputedUpdates(res.updates);
            setMergeSuccess(false);
            toast.success(`Matched & calculated ${res.updates.length} student records for "${effectiveSheet}"!`);

            const mergedDataset = applyComputedUpdatesToGrid(masterCols, masterRows, res.updates, effectivePath);

            const finalResult = {
              ...mergedDataset,
              updates: res.updates,
              alignment: res.alignment,
              sheetName: effectiveSheet,
              targetPath: effectivePath,
            };

            updateNodeData("updates", res.updates);
            updateNodeData("alignment", res.alignment);
            updateNodeData("result", finalResult);

            // Push to desk store merged preview
            deskStore.setMergedPreview(finalResult);
          } else {
            toast.error("Alignment returned no valid updates.");
          }
        },
        onError: (err: any) => {
          console.error("Dynamic alignment error:", err);
          toast.error("Alignment failed: " + (err?.response?.data?.detail || err?.message || err));
        },
      }
    );
  };

  const handleMergeToMasterSheet = async () => {
    if (!computedUpdates || computedUpdates.length === 0) {
      toast.error("No computed updates available. Run 'Align & Compute Updates' first.");
      return;
    }

    setIsMerging(true);
    try {
      const store = useMasterSheetStore.getState();
      const deskStore = (await import("@/stores/desk-store")).useDeskStore.getState();
      const { applyUpdatesToMasterSheet } = await import("@/lib/sheet-utils");

      const effectiveSheet = data?.incomingSheetName || selectedSheet || "Sheet1";
      const effectivePath = data?.incomingTargetPath || targetPath || "CO24554/Th.";

      let currentSheetRaw =
        store.sheets[effectiveSheet]?.data ||
        deskStore.activeMasterSheetData ||
        deskStore.masterSheetPreview ||
        data?.masterGrid;

      const updatedMasterSheet = applyUpdatesToMasterSheet(currentSheetRaw, computedUpdates, effectivePath);

      // Update in-memory store for live spreadsheet grid view
      store.setSheetData(effectiveSheet, updatedMasterSheet);
      deskStore.setDeskMasterSheetData(updatedMasterSheet);

      store.pushData({
        masterSheetName: effectiveSheet,
        sheetName: effectiveSheet,
        data: updatedMasterSheet,
        blockCodenames: [effectivePath],
        pushedBy: "workflow",
        pushedByName: "Dynamic MasterSheet Node",
        pushedAt: Date.now(),
        sourceNodeId: id,
      });

      setMergeSuccess(true);
      toast.success(`Merged ${computedUpdates.length} updates into "${effectiveSheet}". Click Save Sheet in MasterSheet to persist.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Merge failed: " + (err.message || err));
    } finally {
      setIsMerging(false);
    }
  };

  // Sync incoming sheet name from connected handle
  useEffect(() => {
    if (data?.incomingSheetName && data.incomingSheetName !== selectedSheet) {
      setSelectedSheet(data.incomingSheetName);
    }
  }, [data?.incomingSheetName]);

  return (
    <div className="w-84 rounded-xl border border-indigo-500/40 bg-card shadow-xl text-foreground transition-all">
      {/* NodeMenu + Delete */}
      <div className="flex justify-between items-center px-3 pt-2">
        <NodeMenu />
        <IconTrash className="size-4 cursor-pointer text-red-400 hover:text-red-600" onClick={handleDelete} />
      </div>

      {/* Input Handles — 4 labeled ports */}
      <Handle type="target" position={Position.Left} id="data-input" style={{ top: "15%" }} />
      <Handle type="target" position={Position.Left} id="sheet-name" style={{ top: "39%" }} />
      <Handle type="target" position={Position.Left} id="target-path" style={{ top: "63%" }} />
      <Handle type="target" position={Position.Left} id="custom-prompt" style={{ top: "87%" }} />

      {/* Handle Labels */}
      <div className="absolute left-[-4px] text-[7px] text-blue-400 font-semibold" style={{ top: '12%', transform: 'translateX(-100%)' }}>
        CSV Data
      </div>
      <div className="absolute left-[-4px] text-[7px] text-amber-400 font-semibold" style={{ top: '36%', transform: 'translateX(-100%)' }}>
        Sheet Name
      </div>
      <div className="absolute left-[-4px] text-[7px] text-emerald-400 font-semibold" style={{ top: '60%', transform: 'translateX(-100%)' }}>
        Target Path
      </div>
      <div className="absolute left-[-4px] text-[7px] text-purple-400 font-semibold" style={{ top: '84%', transform: 'translateX(-100%)' }}>
        Prompt
      </div>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} id="updates" style={{ top: "50%" }} />
      <div className="absolute right-[-4px] text-[7px] text-indigo-400 font-semibold" style={{ top: '47%', transform: 'translateX(100%)' }}>
        Updates
      </div>

      <div className="p-4 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">Dynamic MasterSheet Node</h3>
            <p className="text-[10px] text-muted-foreground">AI Align · Multi-Sheet</p>
          </div>
        </div>
        {computedUpdates.length > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
            {computedUpdates.length} ready
          </Badge>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {/* User API Key Entry */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <Key className="size-3 text-indigo-400" /> Your Gemini / AI API Key
            </label>
            <button
              onClick={handleSaveApiKey}
              disabled={isSavingKey || !apiKey}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
              title="Save key to user account"
            >
              {keySavedSuccess ? <Check className="size-3 text-green-400" /> : <Save className="size-3" />}
              <span>{keySavedSuccess ? "Saved" : "Save to Account"}</span>
            </button>
          </div>
          <div className="w-full flex justify-between">
            <Input
            type={typePass?"password":"text"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              updateNodeData("apiKey", e.target.value);
            }}
            placeholder="Paste your API key here..."
            className="h-8 text-xs font-mono"
          />
          <Eye className="p-1" onClick={()=>setTypePass(!typePass)}/>
          </div>
        </div>

        {/* Target Sheet Tab Name — accepts DeskTextInput via sheet-name handle */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground flex items-center justify-between mb-1">
            <span className="flex items-center gap-1">
              <Table2 className="size-3 text-amber-400" /> Sheet Tab Name
            </span>
            {data?.incomingSheetName ? (
              <span className="text-[9px] text-amber-400 font-mono">← connected</span>
            ) : availableSheets.length > 0 ? (
              <span className="text-[9px] text-indigo-400 font-mono">
                {availableSheets.length} detected
              </span>
            ) : null}
          </label>
          <Input
            value={data?.incomingSheetName || selectedSheet}
            disabled={!!data?.incomingSheetName}
            onChange={(e) => {
              setSelectedSheet(e.target.value);
              updateNodeData("selectedSheet", e.target.value);
            }}
            list={`sheet-suggestions-${id}`}
            placeholder="e.g. Sheet1"
            className="h-8 text-xs font-mono"
          />
          {!data?.incomingSheetName && availableSheets.length > 0 && (
            <datalist id={`sheet-suggestions-${id}`}>
              {availableSheets.map((sheet) => (
                <option key={sheet} value={sheet} />
              ))}
            </datalist>
          )}
        </div>

        {/* Dynamic Column Target Path */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground flex items-center justify-between mb-1">
            <span>Target Column / Path</span>
            {data?.incomingTargetPath && (
              <span className="text-[9px] text-indigo-400 font-mono">connected handle</span>
            )}
          </label>
          <Input
            value={data?.incomingTargetPath || targetPath}
            onChange={(e) => {
              setTargetPath(e.target.value);
              updateNodeData("targetPath", e.target.value);
            }}
            placeholder="e.g. C024554/th or C024554/lab"
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* Custom AI Prompt */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground flex items-center justify-between mb-1">
            <span>Custom Prompt (LangChain LLM)</span>
            {data?.incomingCustomPrompt && (
              <span className="text-[9px] text-purple-400 font-mono">← connected</span>
            )}
          </label>
          <textarea
            value={data?.incomingCustomPrompt || customPrompt}
            disabled={!!data?.incomingCustomPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value);
              updateNodeData("customPrompt", e.target.value);
            }}
            rows={2}
            placeholder="e.g. Calculate present count for CO24554 Theory, compute percentage, update columns..."
            className="w-full p-2 text-[11px] rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Error Display */}
        {alignMutation.isError && (
          <div className="p-2 rounded bg-destructive/10 text-destructive text-[10px] flex items-center gap-1.5">
            <AlertCircle className="size-3 shrink-0" />
            <span>{(alignMutation.error as any)?.message || "Alignment failed"}</span>
          </div>
        )}

        {/* Primary Action Button: Align & Compute */}
        <Button
          onClick={handleAlign}
          disabled={alignMutation.isPending}
          className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
        >
          {alignMutation.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Calculating Updates...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              <span>Align & Compute Updates</span>
            </>
          )}
        </Button>

        {/* Merge Button (Available once calculated) */}
        {computedUpdates.length > 0 && (
          <Button
            onClick={handleMergeToMasterSheet}
            disabled={isMerging}
            variant="outline"
            className="w-full h-8 border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs font-semibold gap-1.5"
          >
            {isMerging ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Merging into {selectedSheet}...</span>
              </>
            ) : mergeSuccess ? (
              <>
                <CheckCircle2 className="size-3.5 text-green-400" />
                <span>Merged into {selectedSheet}!</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>Confirm Merge ({computedUpdates.length}) to {selectedSheet}</span>
              </>
            )}
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
