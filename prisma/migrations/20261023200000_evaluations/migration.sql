-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN "evaluationRemindersOptOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EvaluationResponse" (
    "id" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'brouillon',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationReminder" (
    "id" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResponse_inscriptionId_type_key" ON "EvaluationResponse"("inscriptionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationReminder_inscriptionId_kind_key" ON "EvaluationReminder"("inscriptionId", "kind");

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationReminder" ADD CONSTRAINT "EvaluationReminder_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
