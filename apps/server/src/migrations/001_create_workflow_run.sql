-- ═══════════════════════════════════════════════════════════
-- Migration: Create workflow_run table
-- Stores execution history for backend workflow runs
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workflow_run (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflowId"  UUID NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
  "userId"      TEXT NOT NULL,
  dashid        TEXT NOT NULL,
  "blockId"     TEXT,
  status        TEXT NOT NULL DEFAULT 'idle'
                CHECK (status IN ('idle','running','paused','completed','error','cancelled')),
  "nodeStates"  JSONB NOT NULL DEFAULT '{}',
  inputs        JSONB NOT NULL DEFAULT '{}',
  output        JSONB,
  "pausedAtNodeId" TEXT,
  "pausedRequest"  JSONB,
  error         TEXT,
  "startedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMPTZ,
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by workflow
CREATE INDEX IF NOT EXISTS idx_workflow_run_workflow_id ON workflow_run("workflowId");
-- Index for user's runs
CREATE INDEX IF NOT EXISTS idx_workflow_run_user_id ON workflow_run("userId");
-- Index for active runs
CREATE INDEX IF NOT EXISTS idx_workflow_run_status ON workflow_run(status) WHERE status IN ('running', 'paused');

-- Enable RLS
ALTER TABLE workflow_run ENABLE ROW LEVEL SECURITY;

-- Policy: users can see their own runs
CREATE POLICY "Users can view own runs"
  ON workflow_run FOR SELECT
  USING ("userId" = auth.uid()::text);

CREATE POLICY "Users can insert own runs"
  ON workflow_run FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "Users can update own runs"
  ON workflow_run FOR UPDATE
  USING ("userId" = auth.uid()::text);

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role full access"
  ON workflow_run FOR ALL
  USING (auth.role() = 'service_role');
