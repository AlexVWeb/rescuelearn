-- AlterEnum
ALTER TYPE "ProgressionExerciseType" ADD VALUE 'VIDEO';

-- AlterTable
ALTER TABLE "ProgressionNodeExercise" ADD COLUMN     "videoDurationSec" INTEGER,
ADD COLUMN     "videoTitle" TEXT,
ADD COLUMN     "videoYoutubeId" TEXT;

-- CreateTable
CREATE TABLE "PlayerVideoWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "watchedSec" INTEGER NOT NULL DEFAULT 0,
    "lastCheckpointAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlayerVideoWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerVideoWatch_userId_exerciseId_key" ON "PlayerVideoWatch"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "PlayerVideoWatch" ADD CONSTRAINT "PlayerVideoWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerVideoWatch" ADD CONSTRAINT "PlayerVideoWatch_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "ProgressionNodeExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS deny-all comme les autres tables public (cf. 20261006170000_enable_rls_all_public_tables).
-- Les droits anon sont déjà retirés par défaut (20261006190000_revoke_anon_table_privileges).
ALTER TABLE "PlayerVideoWatch" ENABLE ROW LEVEL SECURITY;
