-- CreateTable
CREATE TABLE "TrainingSessionFormateur" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSessionFormateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSessionFormateur_userId_idx" ON "TrainingSessionFormateur"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSessionFormateur_trainingSessionId_userId_key" ON "TrainingSessionFormateur"("trainingSessionId", "userId");

-- AddForeignKey
ALTER TABLE "TrainingSessionFormateur" ADD CONSTRAINT "TrainingSessionFormateur_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSessionFormateur" ADD CONSTRAINT "TrainingSessionFormateur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill : le créateur de chaque session existante devient formateur affecté.
INSERT INTO "TrainingSessionFormateur" ("id", "trainingSessionId", "userId")
SELECT gen_random_uuid()::text, "id", "formateurId" FROM "TrainingSession";

-- RLS deny-all comme les autres tables public (cf. 20261006170000_enable_rls_all_public_tables).
-- Les droits anon sont déjà retirés par défaut (20261006190000_revoke_anon_table_privileges).
ALTER TABLE "TrainingSessionFormateur" ENABLE ROW LEVEL SECURITY;
