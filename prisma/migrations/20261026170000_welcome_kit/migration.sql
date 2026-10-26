-- AlterTable
ALTER TABLE "Organisme" ADD COLUMN "termsFileKey" TEXT,
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "termsUpdatedAt" TIMESTAMP(3);

ALTER TABLE "TrainingSession" ADD COLUMN "accessInfo" TEXT,
ADD COLUMN "toBringExtra" TEXT;

ALTER TABLE "SessionDocument" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'support';

ALTER TABLE "Inscription" ADD COLUMN "checklistDone" JSONB,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "termsFileKey" TEXT,
ADD COLUMN "termsAcceptedIp" TEXT,
ADD COLUMN "termsAcceptedUa" TEXT,
ADD COLUMN "prereadOpenedAt" JSONB;

-- CreateTable
CREATE TABLE "WelcomeKit" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "toBring" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelcomeKit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WelcomeKitDocument" (
    "id" TEXT NOT NULL,
    "welcomeKitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "visibleDaysBefore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelcomeKitDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeKit_organismeId_type_key" ON "WelcomeKit"("organismeId", "type");
CREATE INDEX "WelcomeKitDocument_welcomeKitId_idx" ON "WelcomeKitDocument"("welcomeKitId");

-- AddForeignKey
ALTER TABLE "WelcomeKit" ADD CONSTRAINT "WelcomeKit_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "Organisme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WelcomeKitDocument" ADD CONSTRAINT "WelcomeKitDocument_welcomeKitId_fkey" FOREIGN KEY ("welcomeKitId") REFERENCES "WelcomeKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS
ALTER TABLE "WelcomeKit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WelcomeKitDocument" ENABLE ROW LEVEL SECURITY;
