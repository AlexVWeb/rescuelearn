-- AlterTable
ALTER TABLE "LearningCard" ADD COLUMN     "topicId" TEXT;

-- AddForeignKey
ALTER TABLE "LearningCard" ADD CONSTRAINT "LearningCard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ReferencielTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
