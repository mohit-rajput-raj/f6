-- CreateTable
CREATE TABLE "data_library_file" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileType" TEXT NOT NULL,
    "data" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_library_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_node" (
    "id" UUID NOT NULL,
    "shareKey" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "expectedColumns" JSONB NOT NULL,
    "data" JSONB,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_node_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_library_file_userId_idx" ON "data_library_file"("userId");

-- CreateIndex
CREATE INDEX "data_library_file_workflowId_idx" ON "data_library_file"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "shared_node_shareKey_key" ON "shared_node"("shareKey");

-- CreateIndex
CREATE INDEX "shared_node_creatorId_idx" ON "shared_node"("creatorId");

-- CreateIndex
CREATE INDEX "shared_node_shareKey_idx" ON "shared_node"("shareKey");

-- AddForeignKey
ALTER TABLE "data_library_file" ADD CONSTRAINT "data_library_file_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_library_file" ADD CONSTRAINT "data_library_file_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_node" ADD CONSTRAINT "shared_node_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
