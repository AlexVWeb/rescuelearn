/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Organisme` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[emailHash,organismeId]` on the table `Trainee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Organisme` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExternalTraining" ADD COLUMN     "isFC" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Inscription" ADD COLUMN     "attestationResult" TEXT,
ADD COLUMN     "attestationValidatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organisme" ADD COLUMN     "federationName" TEXT,
ADD COLUMN     "isQualiopi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legalRepFirstName" TEXT,
ADD COLUMN     "legalRepJobTitle" TEXT,
ADD COLUMN     "legalRepLastName" TEXT,
ADD COLUMN     "legalStatus" TEXT,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "qualiopiCertifiedBy" TEXT,
ADD COLUMN     "retentionYearsActive" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "retentionYearsArchive" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "smtpFrom" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPassword" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtpUser" TEXT,
ADD COLUMN     "tvaNumber" TEXT;

-- Update existing Organisme rows to have a temporary unique slug using their ID
UPDATE "Organisme" SET "slug" = "id" WHERE "slug" IS NULL;

-- Make slug NOT NULL
ALTER TABLE "Organisme" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Trainee" ADD COLUMN     "ageAtFormation" INTEGER,
ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "civility" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "emailHash" TEXT,
ADD COLUMN     "isAnonymized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "dateOfBirth" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TrainingSession" ADD COLUMN     "isFC" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Organisme_slug_key" ON "Organisme"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Trainee_emailHash_organismeId_key" ON "Trainee"("emailHash", "organismeId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organisme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organisme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
