-- CreateTable
CREATE TABLE "master_sheet" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_sheet_history" (
    "id" UUID NOT NULL,
    "masterSheetId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "dataBefore" JSONB,
    "dataAfter" JSONB,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_sheet_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "master_sheet_userId_idx" ON "master_sheet"("userId");

-- CreateIndex
CREATE INDEX "master_sheet_history_masterSheetId_idx" ON "master_sheet_history"("masterSheetId");

-- AddForeignKey
ALTER TABLE "master_sheet" ADD CONSTRAINT "master_sheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_sheet_history" ADD CONSTRAINT "master_sheet_history_masterSheetId_fkey" FOREIGN KEY ("masterSheetId") REFERENCES "master_sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
