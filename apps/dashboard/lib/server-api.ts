"use client";

// ═══════════════════════════════════════════════════════════
// Server API Client — Communicates with Express backend
// Used for workflow execution, chat, block access, etc.
// ═══════════════════════════════════════════════════════════

const API_BASE =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000/api/v1";

// ── Generic fetch wrapper ────────────────────────────────────

export interface ServerApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ServerApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorObj?: ServerApiError;
}

async function serverFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<ServerApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      const errMsg =
        json?.error?.message ||
        json?.message ||
        (typeof json?.error === "string" ? json.error : `HTTP ${res.status}`);
      const errCode =
        json?.error?.code ||
        json?.code ||
        (!res.ok ? `HTTP_${res.status}` : "INTERNAL_ERROR");

      return {
        success: false,
        error: errMsg,
        errorObj: {
          message: errMsg,
          code: errCode,
          details: json?.error?.details || json?.error || json,
        },
      };
    }

    return { success: true, data: json.data ?? json };
  } catch (err: any) {
    const errMsg = err?.message || "Server unreachable";
    return {
      success: false,
      error: errMsg,
      errorObj: {
        message: errMsg,
        code: "NETWORK_ERROR",
        details: err,
      },
    };
  }
}

// ── Execution API ────────────────────────────────────────────

export interface RunWorkflowParams {
  workflowId: string;
  userId: string;
  dashid: string;
  blockId?: string;
  deskInputs?: Record<string, any>;
  nodeOverrides?: Record<string, any>;
}

export interface RunResult {
  runId: string;
  status: string;
}

export interface RunStatus {
  id: string;
  workflowId: string;
  status: "idle" | "running" | "paused" | "completed" | "error" | "cancelled";
  nodeStates: Record<string, any>;
  output?: any;
  error?: string | null;
  pausedRequest?: any;
}

export interface RunListItem {
  id: string;
  workflowId: string;
  userId: string;
  dashid: string;
  blockId?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

/** Start a new workflow execution on the server */
export async function runWorkflow(params: RunWorkflowParams) {
  return serverFetch<RunResult>("/execution/run", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Resume a paused workflow (human-in-the-loop) */
export async function resumeWorkflow(
  runId: string,
  nodeId: string,
  data?: any,
) {
  return serverFetch(`/execution/${runId}/resume`, {
    method: "POST",
    body: JSON.stringify({ nodeId, data }),
  });
}

/** Cancel a running workflow */
export async function cancelWorkflow(runId: string) {
  return serverFetch(`/execution/${runId}/cancel`, {
    method: "POST",
  });
}

/** Get current status of a workflow run */
export async function getRunStatus(runId: string) {
  return serverFetch<RunStatus>(`/execution/${runId}/status`);
}

/** Get all active (running/paused) runs for a project/dash */
export async function getActiveRuns(dashid: string) {
  return serverFetch<RunStatus[]>(`/execution/active/${dashid}`);
}

/** List all runs for a workflow */
export async function listRuns(workflowId: string, limit = 20) {
  return serverFetch<RunListItem[]>(
    `/execution/runs/${workflowId}?limit=${limit}`,
  );
}

// ── Health Check ─────────────────────────────────────────────

/** Check if the Express server is reachable */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
