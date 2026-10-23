-- CreateTable
CREATE TABLE "AttestationSignature" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signatureImageKey" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "AttestationSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignedAttestation" (
    "id" TEXT NOT NULL,
    "signatureId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "SignedAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttestationSignature_trainingSessionId_idx" ON "AttestationSignature"("trainingSessionId");

-- CreateIndex
CREATE INDEX "SignedAttestation_inscriptionId_idx" ON "SignedAttestation"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "SignedAttestation_signatureId_inscriptionId_key" ON "SignedAttestation"("signatureId", "inscriptionId");

-- AddForeignKey
ALTER TABLE "AttestationSignature" ADD CONSTRAINT "AttestationSignature_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationSignature" ADD CONSTRAINT "AttestationSignature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttestationSignature" ADD CONSTRAINT "AttestationSignature_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedAttestation" ADD CONSTRAINT "SignedAttestation_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "AttestationSignature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignedAttestation" ADD CONSTRAINT "SignedAttestation_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Une seule signature active par session (Prisma ne sait pas exprimer l'index partiel)
CREATE UNIQUE INDEX "AttestationSignature_active_session_key"
  ON "AttestationSignature" ("trainingSessionId")
  WHERE "revokedAt" IS NULL;

-- RLS deny-all comme les autres tables public (cf. 20261006170000_enable_rls_all_public_tables).
ALTER TABLE "AttestationSignature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignedAttestation" ENABLE ROW LEVEL SECURITY;
