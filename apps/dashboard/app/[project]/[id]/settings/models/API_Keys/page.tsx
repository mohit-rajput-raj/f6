"use client";

import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsErrorFallback } from "../../_components/settings-error-boundary";
import { SettingsPageSkeleton } from "../../_components/settings-skeletons";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import { Input } from "@repo/ui/components/ui/input";
import { toast } from "sonner";
import { IconKey, IconPlus, IconTrash, IconCopy, IconCheck, IconEye, IconEyeOff } from "@tabler/icons-react";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  secret: string;
  created: string;
  lastUsed: string;
};

function ApiKeysForm() {
  const [keys, setKeys] = useState<ApiKey[]>([
    {
      id: "key-1",
      name: "Production Model Server",
      keyPrefix: "ux_live_89a7",
      secret: "ux_live_89a7f290c411b9a2e389d701",
      created: "2026-06-12",
      lastUsed: "2 mins ago",
    },
    {
      id: "key-2",
      name: "Staging Pipeline",
      keyPrefix: "ux_test_31b4",
      secret: "ux_test_31b4097e281cc410a552f902",
      created: "2026-07-01",
      lastUsed: "Yesterday",
    },
  ]);

  const [newKeyName, setNewKeyName] = useState("");
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

    setKeys([createdKey, ...keys]);
    setNewKeyName("");
    toast.success(`API Key "${createdKey.name}" generated successfully!`);
  };

  const handleRevokeKey = (id: string, name: string) => {
    setKeys(keys.filter((k) => k.id !== id));
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

  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <IconKey className="size-5 text-primary" />
          <CardTitle className="text-xl font-bold tracking-tight">API Keys & Access Tokens</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Manage secure API keys used to authenticate requests to UNIXL model execution workflows and SDKs.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Create Key Form */}
        <form onSubmit={handleCreateKey} className="p-4 rounded-xl bg-muted/30 border space-y-3">
          <h4 className="text-sm font-semibold">Generate New API Key</h4>
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
