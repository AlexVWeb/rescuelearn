-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiPrompt" TEXT,
ADD COLUMN     "generatedByAi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referencielId" INTEGER,
ADD COLUMN     "status" "QuizStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_referencielId_fkey" FOREIGN KEY ("referencielId") REFERENCES "Referenciel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
