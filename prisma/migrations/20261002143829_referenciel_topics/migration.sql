-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('NONE', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "ProgressionTree" ADD COLUMN     "referencielId" INTEGER;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "Referenciel" ADD COLUMN     "analysisDoneChapters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "analysisError" TEXT,
ADD COLUMN     "analysisStartedAt" TIMESTAMP(3),
ADD COLUMN     "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "analysisTotalChapters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "levels" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ReferencielTopic" (
    "id" TEXT NOT NULL,
    "referencielId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "levels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL,
    "questionCapacity" INTEGER NOT NULL DEFAULT 5,
    "suggestedFormats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferencielTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProgressionNodeToReferencielTopic" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProgressionNodeToReferencielTopic_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "ReferencielTopic_referencielId_order_idx" ON "ReferencielTopic"("referencielId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ReferencielTopic_referencielId_slug_key" ON "ReferencielTopic"("referencielId", "slug");

-- CreateIndex
CREATE INDEX "_ProgressionNodeToReferencielTopic_B_index" ON "_ProgressionNodeToReferencielTopic"("B");

-- AddForeignKey
ALTER TABLE "ReferencielTopic" ADD CONSTRAINT "ReferencielTopic_referencielId_fkey" FOREIGN KEY ("referencielId") REFERENCES "Referenciel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionTree" ADD CONSTRAINT "ProgressionTree_referencielId_fkey" FOREIGN KEY ("referencielId") REFERENCES "Referenciel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ReferencielTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProgressionNodeToReferencielTopic" ADD CONSTRAINT "_ProgressionNodeToReferencielTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "ProgressionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProgressionNodeToReferencielTopic" ADD CONSTRAINT "_ProgressionNodeToReferencielTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "ReferencielTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
