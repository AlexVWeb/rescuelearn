-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "TrainingGroup" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "formateurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingGroup_trainingSessionId_idx" ON "TrainingGroup"("trainingSessionId");

-- CreateIndex
CREATE INDEX "TrainingGroup_formateurId_idx" ON "TrainingGroup"("formateurId");

-- CreateIndex
CREATE INDEX "Inscription_groupId_idx" ON "Inscription"("groupId");

-- AddForeignKey
ALTER TABLE "TrainingGroup" ADD CONSTRAINT "TrainingGroup_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroup" ADD CONSTRAINT "TrainingGroup_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS deny-all comme les autres tables public (cf. 20261006170000_enable_rls_all_public_tables).
ALTER TABLE "TrainingGroup" ENABLE ROW LEVEL SECURITY;
