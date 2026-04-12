-- CreateTable
CREATE TABLE "published_workflow" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "publisherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "definition" JSONB NOT NULL,
    "inputSchema" JSONB,
    "outputSchema" JSONB,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "published_workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_installation" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "publishedWorkflowId" UUID NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_installation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "published_workflow_publisherId_idx" ON "published_workflow"("publisherId");

-- CreateIndex
CREATE INDEX "published_workflow_workflowId_idx" ON "published_workflow"("workflowId");

-- CreateIndex
CREATE INDEX "published_workflow_isPublic_idx" ON "published_workflow"("isPublic");

-- CreateIndex
CREATE INDEX "workflow_installation_userId_idx" ON "workflow_installation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_installation_userId_publishedWorkflowId_key" ON "workflow_installation"("userId", "publishedWorkflowId");

-- AddForeignKey
ALTER TABLE "published_workflow" ADD CONSTRAINT "published_workflow_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_workflow" ADD CONSTRAINT "published_workflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_installation" ADD CONSTRAINT "workflow_installation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_installation" ADD CONSTRAINT "workflow_installation_publishedWorkflowId_fkey" FOREIGN KEY ("publishedWorkflowId") REFERENCES "published_workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
