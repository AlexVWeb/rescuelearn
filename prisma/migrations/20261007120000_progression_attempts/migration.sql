-- CreateTable
CREATE TABLE "ProgressionAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProgressionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionAttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressionAttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressionAttempt_userId_nodeId_idx" ON "ProgressionAttempt"("userId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressionAttemptAnswer_attemptId_exerciseId_key" ON "ProgressionAttemptAnswer"("attemptId", "exerciseId");

-- AddForeignKey
ALTER TABLE "ProgressionAttempt" ADD CONSTRAINT "ProgressionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionAttempt" ADD CONSTRAINT "ProgressionAttempt_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ProgressionNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionAttemptAnswer" ADD CONSTRAINT "ProgressionAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ProgressionAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionAttemptAnswer" ADD CONSTRAINT "ProgressionAttemptAnswer_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "ProgressionNodeExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS deny-all comme les autres tables public (cf. 20261006170000_enable_rls_all_public_tables).
-- Prisma (proprietaire postgres) n'est pas impacte.
ALTER TABLE "ProgressionAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProgressionAttemptAnswer" ENABLE ROW LEVEL SECURITY;
