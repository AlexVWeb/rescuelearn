-- AlterTable
ALTER TABLE "ProgressionTree" ADD COLUMN     "generationDone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "generationError" TEXT,
ADD COLUMN     "generationPlan" JSONB,
ADD COLUMN     "generationStartedAt" TIMESTAMP(3),
ADD COLUMN     "generationStatus" "AnalysisStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "generationTotal" INTEGER NOT NULL DEFAULT 0;
