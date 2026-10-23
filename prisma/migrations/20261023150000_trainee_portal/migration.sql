-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "attestationsPublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "accessTokenHash" TEXT,
ADD COLUMN     "accessSentAt" TIMESTAMP(3),
ADD COLUMN     "accessLastUsedAt" TIMESTAMP(3),
ADD COLUMN     "pinFailedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Emargement" ADD COLUMN     "signedVia" TEXT;

-- CreateTable
CREATE TABLE "SessionDocument" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "visibleFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_accessTokenHash_key" ON "Inscription"("accessTokenHash");

-- CreateIndex
CREATE INDEX "SessionDocument_trainingSessionId_idx" ON "SessionDocument"("trainingSessionId");

-- AddForeignKey
ALTER TABLE "SessionDocument" ADD CONSTRAINT "SessionDocument_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS deny-all comme les autres tables public (cf. 20261006170000_enable_rls_all_public_tables).
ALTER TABLE "SessionDocument" ENABLE ROW LEVEL SECURITY;
