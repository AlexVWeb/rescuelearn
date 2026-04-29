-- CreateTable
CREATE TABLE "ExternalTraining" (
    "id" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "organismeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisme" TEXT NOT NULL,
    "obtainedAt" DATE NOT NULL,
    "certificateNumber" TEXT,
    "fileUrl" TEXT,
    "fileKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalTraining_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExternalTraining" ADD CONSTRAINT "ExternalTraining_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "Trainee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
