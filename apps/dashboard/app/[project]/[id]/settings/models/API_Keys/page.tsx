"use client";

import React, { useState, useEffect, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import { IconKey, IconPlus, IconTrash, IconCopy, IconCheck, IconEye, IconEyeOff, IconLoader2 } from "@tabler/icons-react";
import { useSession } from "@/lib/auth-client";
import { saveUserLLMKeys, getUserLLMKeys } from "@/app/[project]/dash/[dashid]/(documents)/data-library/api-key-actions";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  secret: string;
  created: string;
  lastUsed: string;
};

const LOCAL_APP_KEYS_STORAGE_KEY = "APP_ACCESS_KEYS";

function ApiKeysForm() {
  const { data: sessionData } = useSession();

  // Custom App Access Keys State (starts empty, persisted in localStorage)
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_APP_KEYS_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored app keys", e);
      }
    }
    return [];
  });

  const [newKeyName, setNewKeyName] = useState("");
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // LLM Provider Keys State
  const [geminiKey, setGeminiKey] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("GEMINI_API_KEY") || "" : ""));
  const [openaiKey, setOpenaiKey] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("OPENAI_API_KEY") || "" : ""));
  const [claudeKey, setClaudeKey] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("CLAUDE_API_KEY") || "" : ""));
  const [isSavingLLMKeys, setIsSavingLLMKeys] = useState(false);
  const [isLoadingLLMKeys, setIsLoadingLLMKeys] = useState(false);

  // Load LLM Keys from DB when session is available
  useEffect(() => {
    if (!sessionData?.user?.id) return;
    setIsLoadingLLMKeys(true);
    getUserLLMKeys(sessionData.user.id)
      .then((keysData) => {
        if (keysData.geminiApiKey !== undefined) {
          const val = keysData.geminiApiKey || "";
          setGeminiKey(val);
          if (typeof window !== "undefined") localStorage.setItem("GEMINI_API_KEY", val);
        }
        if (keysData.openaiApiKey !== undefined) {
          const val = keysData.openaiApiKey || "";
          setOpenaiKey(val);
          if (typeof window !== "undefined") localStorage.setItem("OPENAI_API_KEY", val);
        }
        if (keysData.claudeApiKey !== undefined) {
          const val = keysData.claudeApiKey || "";
          setClaudeKey(val);
          if (typeof window !== "undefined") localStorage.setItem("CLAUDE_API_KEY", val);
        }
      })
      .catch((err) => {
        console.warn("Failed to load user LLM keys from DB:", err);
      })
      .finally(() => {
        setIsLoadingLLMKeys(false);
      });
  }, [sessionData?.user?.id]);

  // Sync custom app keys to localStorage
  const updateAppKeys = (updatedKeys: ApiKey[]) => {
    setKeys(updatedKeys);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_APP_KEYS_STORAGE_KEY, JSON.stringify(updatedKeys));
    }
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("Please provide a name for the API key.");
      return;
    }

    const randomHash = Math.random().toString(36).substring(2, 10);
    const createdKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName.trim(),
      keyPrefix: `ux_live_${randomHash.substring(0, 4)}`,
      secret: `ux_live_${randomHash}${Date.now().toString(36)}`,
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
    };

    const nextKeys = [createdKey, ...keys];
    updateAppKeys(nextKeys);
    setNewKeyName("");
    toast.success(`API Key "${createdKey.name}" generated successfully!`);
  };

  const handleRevokeKey = (id: string, name: string) => {
    const nextKeys = keys.filter((k) => k.id !== id);
    updateAppKeys(nextKeys);
    toast.info(`API Key "${name}" revoked.`);
  };

  const handleCopy = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    toast.success("API key copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVisibility = (id: string) => {
    setShowSecret((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveProviderKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLLMKeys(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("GEMINI_API_KEY", geminiKey);
      localStorage.setItem("OPENAI_API_KEY", openaiKey);
      localStorage.setItem("CLAUDE_API_KEY", claudeKey);
    }

    if (sessionData?.user?.id) {
      try {
        await saveUserLLMKeys(sessionData.user.id, {
          geminiApiKey: geminiKey,
          openaiApiKey: openaiKey,
          claudeApiKey: claudeKey,
        });
        toast.success("AI Model provider keys updated successfully in database!");
      } catch (err) {
        console.error("DB save failed:", err);
        toast.error("Failed to save keys to database, saved locally.");
      } finally {
        setIsSavingLLMKeys(false);
      }
    } else {
      toast.success("AI Model provider keys saved locally!");
      setIsSavingLLMKeys(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconKey className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">API Keys & Model Credentials</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Configure personal AI provider API keys (Gemini, OpenAI, Claude) for your block agent executions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Model Provider Keys */}
        <form onSubmit={handleSaveProviderKeys} className="p-4 rounded-xl bg-card border space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">AI Model Provider API Keys</h4>
            {isLoadingLLMKeys && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <IconLoader2 className="size-3.5 animate-spin text-primary" /> Loading keys...
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Google Gemini API Key</label>
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                disabled={isLoadingLLMKeys || isSavingLLMKeys}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">OpenAI API Key</label>
              <Input
                type="password"
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                disabled={isLoadingLLMKeys || isSavingLLMKeys}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Anthropic Claude API Key</label>
              <Input
                type="password"
                placeholder="sk-ant-..."
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                disabled={isLoadingLLMKeys || isSavingLLMKeys}
              />
            </div>
          </div>
          <Button type="submit" disabled={isSavingLLMKeys || isLoadingLLMKeys} className="gap-2 font-medium shrink-0 text-xs">
            {isSavingLLMKeys ? (
              <>
                <IconLoader2 className="size-3.5 animate-spin" />
                Saving Keys...
              </>
            ) : (
              "Save Provider Keys"
            )}
          </Button>
        </form>

        {/* Create Custom App Key Form */}
        <form onSubmit={handleCreateKey} className="p-4 rounded-xl bg-muted/30 border space-y-3">
          <h4 className="text-sm font-semibold">Generate App Access Key</h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Key description (e.g. Analytics Microservice)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="gap-2 font-medium shrink-0">
              <IconPlus className="size-4" />
              Create Key
            </Button>
          </div>
        </form>

        {/* Existing Keys Table */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Active Keys ({keys.length})</h4>
          {keys.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
              No active API keys found. Generate a key to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((keyItem) => (
                <div
                  key={keyItem.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{keyItem.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {keyItem.keyPrefix}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span>
                        {showSecret[keyItem.id]
                          ? keyItem.secret
                          : `${keyItem.keyPrefix}••••••••••••••••`}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleVisibility(keyItem.id)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showSecret[keyItem.id] ? (
                          <IconEyeOff className="size-3.5" />
                        ) : (
                          <IconEye className="size-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] text-muted-foreground pt-0.5">
                      Created: {keyItem.created} • Last used: {keyItem.lastUsed}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(keyItem.id, keyItem.secret)}
                      className="gap-1.5 text-xs"
                    >
                      {copiedId === keyItem.id ? (
                        <IconCheck className="size-3.5 text-emerald-500" />
                      ) : (
                        <IconCopy className="size-3.5" />
                      )}
                      Copy Key
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeKey(keyItem.id, keyItem.name)}
                      className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                    >
                      <IconTrash className="size-3.5" />
                      Revoke
                    </Button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApiKeysPage() {
  return (
    <ErrorBoundary FallbackComponent={SettingsErrorFallback}>
      <Suspense fallback={<SettingsPageSkeleton />}>
        <ApiKeysForm />
      </Suspense>
    </ErrorBoundary>
  );
}
