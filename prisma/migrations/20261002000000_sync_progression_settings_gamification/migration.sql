-- Rattrapage : tables/colonnes créées via `db push` sans migration (idempotent).
-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "public"."ProgressionExerciseType" AS ENUM ('QUIZ_QUESTION', 'MICRO_COURSE', 'FLASHCARD', 'MINI_GAME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "hearts" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastQuestionSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "onboardingExpectation" TEXT,
ADD COLUMN IF NOT EXISTS "onboardingExperience" TEXT,
ADD COLUMN IF NOT EXISTS "onboardingObjective" TEXT,
ADD COLUMN IF NOT EXISTS "questionSubscriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "questionSubscriptionFrequency" TEXT,
ADD COLUMN IF NOT EXISTS "streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."DailyQuestionAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[],

    CONSTRAINT "DailyQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."PlayerProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,

    CONSTRAINT "PlayerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ProgressionNode" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "ProgressionNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ProgressionNodeExercise" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "public"."ProgressionExerciseType" NOT NULL,
    "questionId" INTEGER,
    "learningCardId" INTEGER,
    "courseTitle" TEXT,
    "courseContent" TEXT,
    "gameConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionNodeExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."ProgressionTree" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyQuestionAnswer_userId_idx" ON "public"."DailyQuestionAnswer"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerProgress_userId_nodeId_key" ON "public"."PlayerProgress"("userId" ASC, "nodeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProgressionNode_treeId_order_key" ON "public"."ProgressionNode"("treeId" ASC, "order" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProgressionTree_level_key" ON "public"."ProgressionTree"("level" ASC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "public"."SystemSetting"("key" ASC);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."DailyQuestionAnswer" ADD CONSTRAINT "DailyQuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."PlayerProgress" ADD CONSTRAINT "PlayerProgress_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."ProgressionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."PlayerProgress" ADD CONSTRAINT "PlayerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."ProgressionNode" ADD CONSTRAINT "ProgressionNode_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "public"."ProgressionTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."ProgressionNodeExercise" ADD CONSTRAINT "ProgressionNodeExercise_learningCardId_fkey" FOREIGN KEY ("learningCardId") REFERENCES "public"."LearningCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."ProgressionNodeExercise" ADD CONSTRAINT "ProgressionNodeExercise_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."ProgressionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "public"."ProgressionNodeExercise" ADD CONSTRAINT "ProgressionNodeExercise_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
