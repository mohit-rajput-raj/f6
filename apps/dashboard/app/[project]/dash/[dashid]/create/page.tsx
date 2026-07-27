"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconSparkles,
  IconTable,
  IconTemplate,
  IconFileSpreadsheet,
} from "@tabler/icons-react";
import { createWorkFlow } from "../editor/_actions/editor.service";

// ─── Template Definitions ───────────────────────────────────
const TEMPLATES = [
  {
    id: "blank",
    name: "Blank Workflow",
    description: "Start from scratch with an empty desk and blocks.",
    icon: IconSparkles,
    color: "from-zinc-600 to-zinc-700",
    columns: [],
  },
  {
    id: "academic-grade",
    name: "Academic Grade Sheet",
    description: "Pre-configured for student marks, subjects, and GPA calculation.",
    icon: IconFileSpreadsheet,
    color: "from-blue-600 to-indigo-600",
    columns: ["Roll_No", "Student_Name", "Subject", "Marks_Obtained", "Max_Marks", "Grade", "Percentage"],
  },
  {
    id: "attendance-tracker",
    name: "Attendance Tracker",
    description: "Track daily attendance with date columns and summary stats.",
    icon: IconTable,
    color: "from-emerald-600 to-teal-600",
    columns: ["Roll_No", "Student_Name", "Date", "Status", "Total_Present", "Total_Absent", "Attendance_%"],
  },
  {
    id: "inventory",
    name: "Inventory Manager",
    description: "Track items, quantities, pricing, and stock levels.",
    icon: IconTemplate,
    color: "from-amber-600 to-orange-600",
    columns: ["Item_Code", "Item_Name", "Category", "Quantity", "Unit_Price", "Total_Value", "Reorder_Level"],
  },
  {
    id: "survey-results",
    name: "Survey Results",
    description: "Collect and analyze survey responses with scoring.",
    icon: IconFileSpreadsheet,
    color: "from-purple-600 to-pink-600",
    columns: ["Respondent_ID", "Name", "Q1_Score", "Q2_Score", "Q3_Score", "Average_Score", "Feedback"],
  },
];

export default function CreateWorkflowPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [step, setStep] = useState(1);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customColumns, setCustomColumns] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedTpl = TEMPLATES.find((t) => t.id === selectedTemplate);

  const handleCreate = async () => {
    if (!userId || !workflowName.trim()) {
      toast.error("Please provide a workflow name.");
      return;
    }

    setIsCreating(true);
    try {
      const newWorkflow = await createWorkFlow({ id: userId, name: workflowName.trim() });

      // Redirect to the new workflow's desk page
      const dashPath = `/dashboard/dash/${newWorkflow.id}/desk`;
      toast.success(`Workflow "${workflowName}" created!`);
      router.push(dashPath);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create workflow");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Create Workflow</h1>
            <p className="text-sm text-muted-foreground">
              Step {step} of 3 — {step === 1 ? "Name & Description" : step === 2 ? "Choose Template" : "Review & Create"}
            </p>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step ? "w-8 bg-primary" : s < step ? "w-8 bg-primary/50" : "w-8 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-4xl">
          {/* Step 1: Name & Description */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Name your workflow</h2>
                <p className="text-muted-foreground">Give your workflow a clear, descriptive name so your team knows what it's for.</p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="wf-name" className="text-sm font-medium">Workflow Name *</Label>
                  <Input
                    id="wf-name"
                    placeholder="e.g. Q3 Student Grade Sheet"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="h-11 text-base"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wf-desc" className="text-sm font-medium">Description (optional)</Label>
                  <Input
                    id="wf-desc"
                    placeholder="Brief description of this workflow..."
                    value={workflowDesc}
                    onChange={(e) => setWorkflowDesc(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Choose a template</h2>
                <p className="text-muted-foreground">Select a pre-built template or start blank. You can always customize columns later.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon;
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 size-5 rounded-full bg-primary flex items-center justify-center">
                          <IconCheck className="size-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${tpl.color} text-white mb-3`}>
                        <Icon className="size-5" />
                      </div>
                      <h3 className="font-semibold text-sm">{tpl.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tpl.description}</p>
                      {tpl.columns.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {tpl.columns.slice(0, 4).map((col) => (
                            <span key={col} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                              {col}
                            </span>
                          ))}
                          {tpl.columns.length > 4 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              +{tpl.columns.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom columns input for blank template */}
              {selectedTemplate === "blank" && (
                <div className="mt-4 space-y-2 max-w-lg">
                  <Label className="text-sm font-medium">Custom Columns (optional, comma-separated)</Label>
                  <Input
                    placeholder="e.g. Name, Email, Score, Grade"
                    value={customColumns}
                    onChange={(e) => setCustomColumns(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Create */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Review & Create</h2>
                <p className="text-muted-foreground">Confirm your workflow details before creating.</p>
              </div>

              <div className="max-w-lg space-y-4">
                <div className="p-5 rounded-xl border bg-card space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Workflow Name</span>
                    <p className="text-base font-semibold mt-0.5">{workflowName}</p>
                  </div>
                  {workflowDesc && (
                    <div>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Description</span>
                      <p className="text-sm mt-0.5">{workflowDesc}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Template</span>
                    <p className="text-sm font-medium mt-0.5">{selectedTpl?.name || "None selected"}</p>
                  </div>
                  {selectedTpl && selectedTpl.columns.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">MasterSheet Columns</span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {selectedTpl.columns.map((col) => (
                          <span key={col} className="text-xs px-2 py-1 rounded-md bg-muted font-mono">{col}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  After creation you'll be redirected to the Desk where you can add blocks, invite team members, and start processing data.
                </p>
              </div>
            </div>
          )}

          {/* ─── Navigation Buttons ──────────────────────────── */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (step === 1) router.back();
                else setStep(step - 1);
              }}
              className="gap-2"
            >
              <IconArrowLeft className="size-4" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 1 && !workflowName.trim()) {
                    toast.error("Please enter a workflow name.");
                    return;
                  }
                  if (step === 2 && !selectedTemplate) {
                    toast.error("Please select a template.");
                    return;
                  }
                  setStep(step + 1);
                }}
                className="gap-2"
              >
                Next
                <IconArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
              >
                {isCreating ? (
                  <>Creating...</>
                ) : (
                  <>
                    <IconCheck className="size-4" />
                    Create Workflow
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}