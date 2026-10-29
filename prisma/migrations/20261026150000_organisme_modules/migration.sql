-- CreateTable
CREATE TABLE "OrganismeModule" (
    "organismeId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganismeModule_pkey" PRIMARY KEY ("organismeId","module")
);

-- AddForeignKey
ALTER TABLE "OrganismeModule" ADD CONSTRAINT "OrganismeModule_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "Organisme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganismeModule" ENABLE ROW LEVEL SECURITY;

-- Les organismes existants gardent les évaluations (nouveaux : désactivées par défaut)
INSERT INTO "OrganismeModule" ("organismeId", "module", "available", "enabled", "updatedAt")
SELECT "id", 'evaluation', true, true, CURRENT_TIMESTAMP FROM "Organisme";
