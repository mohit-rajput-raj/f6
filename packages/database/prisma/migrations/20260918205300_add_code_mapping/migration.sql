-- CreateTable
CREATE TABLE IF NOT EXISTS "code_mapping" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectWorkflowId" UUID NOT NULL,
    "codePath" TEXT NOT NULL,
    "columnKeyMap" JSONB NOT NULL,
    "mergeConfig" JSONB,
    "filePath" TEXT,
    "fileId" UUID,
    "fileName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "code_mapping_projectWorkflowId_codePath_key" ON "code_mapping"("projectWorkflowId", "codePath");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "code_mapping_projectWorkflowId_idx" ON "code_mapping"("projectWorkflowId");
