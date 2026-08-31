-- CreateTable
CREATE TABLE "alert_acks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "ackedBy" TEXT NOT NULL,
    "note" TEXT,
    "ackedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    "originNode" TEXT NOT NULL DEFAULT 'local',
    "deletedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_acks_kind_refId_key" ON "alert_acks"("kind", "refId");
