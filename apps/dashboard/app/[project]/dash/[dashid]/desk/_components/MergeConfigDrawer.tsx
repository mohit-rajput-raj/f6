"use client"

import React, { useState, useEffect } from "react"
import {
  Plus,
  Minus,
  X as XIcon,
  Divide,
  RotateCcw,
  Save,
  Calculator,
  ArrowRight,
  SlidersHorizontal,
  Info,
  Check,
  Zap,
} from "lucide-react"
import { Button } from "@repo/ui/components/ui/button"
import { Badge } from "@repo/ui/components/ui/badge"
import { Label } from "@repo/ui/components/ui/label"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@repo/ui/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select"
import { toast } from "sonner"

// ─── Types ──────────────────────────────────────────────────

export type MergeOp = "+" | "-" | "*" | "/" | "replace"

export interface MergeOperationConfig {
  op: MergeOp
  sourceField: string
}

export interface MergeConfigMap {
  [keyName: string]: MergeOperationConfig
}

interface MergeConfigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  codePath: string
  columnKeys: string[] // list of column key names to configure
  csvHeaders?: string[] // CSV column headers for sourceField matching
  initialConfig?: MergeConfigMap | null
  onSave: (config: MergeConfigMap) => void | Promise<void>
}

// ─── Operator Definitions ───────────────────────────────────

const OP_CONFIGS: Record<
  MergeOp,
  {
    symbol: string
    title: string
    desc: string
    activeClass: string
    borderActive: string
    badgeColor: string
    previewFormula: (col: string, src: string) => string
  }
> = {
  "+": {
    symbol: "+",
    title: "Add",
    desc: "Accumulate (new = existing + incoming)",
    activeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950",
    borderActive: "border-emerald-500/40",
    badgeColor: "text-emerald-400",
    previewFormula: (col, src) => `sheet.${col} + csv.${src}`,
  },
  "-": {
    symbol: "-",
    title: "Subtract",
    desc: "Deduct (new = existing - incoming)",
    activeClass: "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-950",
    borderActive: "border-amber-500/40",
    badgeColor: "text-amber-400",
    previewFormula: (col, src) => `sheet.${col} - csv.${src}`,
  },
  "*": {
    symbol: "×",
    title: "Multiply",
    desc: "Multiply (new = existing × incoming)",
    activeClass: "bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sm shadow-sky-950",
    borderActive: "border-sky-500/40",
    badgeColor: "text-sky-400",
    previewFormula: (col, src) => `sheet.${col} × csv.${src}`,
  },
  "/": {
    symbol: "÷",
    title: "Divide",
    desc: "Divide (new = existing ÷ incoming)",
    activeClass: "bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-sm shadow-purple-950",
    borderActive: "border-purple-500/40",
    badgeColor: "text-purple-400",
    previewFormula: (col, src) => `sheet.${col} ÷ csv.${src}`,
  },
  replace: {
    symbol: "⟲",
    title: "Replace",
    desc: "Direct overwrite (new = incoming)",
    activeClass: "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-950",
    borderActive: "border-rose-500/40",
    badgeColor: "text-rose-400",
    previewFormula: (_, src) => `csv.${src}`,
  },
}

// ─── Component ──────────────────────────────────────────────

export function MergeConfigDrawer({
  open,
  onOpenChange,
  codePath,
  columnKeys,
  csvHeaders = [],
  initialConfig,
  onSave,
}: MergeConfigDrawerProps) {
  const [config, setConfig] = useState<MergeConfigMap>({})
  const [isSaving, setIsSaving] = useState(false)

  // Initialize configuration
  useEffect(() => {
    if (open) {
      const newConfig: MergeConfigMap = {}
      for (const key of columnKeys) {
        if (initialConfig?.[key]) {
          newConfig[key] = { ...initialConfig[key] }
        } else {
          // Default heuristic: + for count/total/score/class/attend/present, replace for text
          const isNumeric = /total|count|class|attend|present|score|mark|point|amount|qty|quantity|num|pct|percentage/i.test(key)
          newConfig[key] = {
            op: isNumeric ? "+" : "replace",
            sourceField: key,
          }
        }
      }
      setConfig(newConfig)
    }
  }, [open, columnKeys, initialConfig])

  const setColOp = (keyName: string, op: MergeOp) => {
    setConfig((prev) => ({
      ...prev,
      [keyName]: {
        op,
        sourceField: prev[keyName]?.sourceField || keyName,
      },
    }))
  }

  const setColSource = (keyName: string, sourceField: string) => {
    setConfig((prev) => ({
      ...prev,
      [keyName]: {
        op: prev[keyName]?.op || "replace",
        sourceField,
      },
    }))
  }

  const applyBatchOp = (op: MergeOp) => {
    setConfig((prev) => {
      const updated: MergeConfigMap = {}
      for (const key of columnKeys) {
        updated[key] = {
          op,
          sourceField: prev[key]?.sourceField || key,
        }
      }
      return updated
    })
    toast.success(`Applied ${OP_CONFIGS[op].title} to all columns`)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(config)
      toast.success("Merge mapping configuration saved")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="fixed right-0 top-0 bottom-0 w-[460px] max-w-[95vw] rounded-l-2xl rounded-r-none border-l border-zinc-800/90 bg-[#0b0b0e] text-zinc-100 shadow-2xl p-0 flex flex-col"
        style={{ left: "auto" }}
      >
        {/* ── Header ── */}
        <DrawerHeader className="border-b border-zinc-800/80 px-6 py-4 bg-zinc-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Calculator className="size-4" />
              </div>
              <div>
                <DrawerTitle className="text-sm font-semibold tracking-tight text-zinc-100">
                  Merge Mapping & Formula Engine
                </DrawerTitle>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {codePath}
            </span>
          </div>

          <DrawerDescription className="text-xs text-zinc-400 mt-2 text-left leading-relaxed">
            Configure how each column recalculates when incoming files merge with existing MasterSheet records.
          </DrawerDescription>

          {/* ── Quick Batch Actions ── */}
          <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
              <SlidersHorizontal className="size-3 text-zinc-500" /> Batch Presets:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyBatchOp("+")}
                className="px-2 py-1 rounded text-[10px] font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 hover:border-emerald-500/30 transition-all cursor-pointer"
              >
                + Add All
              </button>
              <button
                type="button"
                onClick={() => applyBatchOp("replace")}
                className="px-2 py-1 rounded text-[10px] font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-800 hover:border-rose-500/30 transition-all cursor-pointer"
              >
                ⟲ Overwrite All
              </button>
              <button
                type="button"
                onClick={() => applyBatchOp("-")}
                className="px-2 py-1 rounded text-[10px] font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 hover:border-amber-500/30 transition-all cursor-pointer"
              >
                - Deduct All
              </button>
            </div>
          </div>
        </DrawerHeader>

        {/* ── Body: Column Cards ── */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-3.5">
            {columnKeys.map((keyName, idx) => {
              const cfg = config[keyName] || { op: "replace", sourceField: keyName }
              const opDef = OP_CONFIGS[cfg.op]

              return (
                <div
                  key={keyName}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 p-3.5 space-y-3 transition-colors"
                >
                  {/* Card Header: Key Name + Formula Chip */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 shadow-sm">
                        {keyName}
                      </span>
                    </div>

                    {/* Formula Tag */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 border border-zinc-800/80 text-[10px] font-mono">
                      <span className="text-zinc-500 font-bold select-none">fx</span>
                      <span className={opDef.badgeColor}>
                        {opDef.previewFormula(keyName, cfg.sourceField || keyName)}
                      </span>
                    </div>
                  </div>

                  {/* Segmented Operator Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Math Operation</span>
                      <span className={`text-[10px] font-medium ${opDef.badgeColor}`}>
                        {opDef.desc}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 p-1 rounded-lg bg-black/40 border border-zinc-800/80">
                      {(["+", "-", "*", "/", "replace"] as MergeOp[]).map((op) => {
                        const item = OP_CONFIGS[op]
                        const isSelected = cfg.op === op
                        return (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setColOp(keyName, op)}
                            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md text-xs font-mono transition-all cursor-pointer border ${
                              isSelected
                                ? item.activeClass
                                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-850"
                            }`}
                            title={item.desc}
                          >
                            <span className="font-bold text-sm leading-none">{item.symbol}</span>
                            <span className="text-[9px] font-sans mt-0.5 text-zinc-400">{item.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Source CSV Field Mapping */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800/40 text-xs">
                    <span className="text-zinc-400 text-[11px] shrink-0">Source CSV Field</span>
                    {csvHeaders.length > 0 ? (
                      <Select
                        value={cfg.sourceField || keyName}
                        onValueChange={(val) => setColSource(keyName, val)}
                      >
                        <SelectTrigger className="h-7 text-[11px] font-mono bg-black/40 border-zinc-800 text-zinc-200 max-w-[200px]">
                          <SelectValue placeholder="Select CSV header" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                          {csvHeaders.map((header) => (
                            <SelectItem key={header} value={header} className="text-xs font-mono">
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-[11px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
                        {cfg.sourceField || keyName}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {columnKeys.length === 0 && (
              <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                <Info className="size-6 mx-auto text-zinc-600" />
                <p>No configurable data columns detected.</p>
                <p className="text-[11px] text-zinc-600">Ensure column keys are defined above the preview table.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <DrawerFooter className="border-t border-zinc-800/80 px-6 py-3.5 bg-zinc-950/60 flex flex-row items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            {columnKeys.length} column{columnKeys.length === 1 ? "" : "s"} configured
          </div>
          <div className="flex items-center gap-2">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </DrawerClose>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || columnKeys.length === 0}
              className="text-xs h-8 px-4 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-sm shadow-emerald-950 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="size-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Save & Apply Rules</span>
                </>
              )}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
