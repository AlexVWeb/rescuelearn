-- CreateEnum
CREATE TYPE "Federation" AS ENUM ('CROIX_ROUGE', 'FNPC', 'CROIX_BLANCHE', 'ORDRE_DE_MALTE', 'FFSS', 'FNSPF', 'ANPS', 'UNASS', 'SNSM', 'AUTRE');

-- AlterTable
ALTER TABLE "Organisme" ADD COLUMN "federation" "Federation",
ADD COLUMN "documentHeader" TEXT;

-- Reprise des libellés libres saisis jusqu'ici (cf. federationFromName)
UPDATE "Organisme" SET "federation" = CASE lower(trim("federationName"))
    WHEN lower('Croix-Rouge française') THEN 'CROIX_ROUGE'::"Federation"
    WHEN lower('Fédération Nationale de Protection Civile (FNPC)') THEN 'FNPC'::"Federation"
    WHEN lower('Fédération des Secouristes Français Croix Blanche') THEN 'CROIX_BLANCHE'::"Federation"
    WHEN lower('Ordre de Malte France') THEN 'ORDRE_DE_MALTE'::"Federation"
    WHEN lower('Fédération Française de Sauvetage et de Secourisme (FFSS)') THEN 'FFSS'::"Federation"
    WHEN lower('Fédération Nationale des Sapeurs-Pompiers de France (FNSPF)') THEN 'FNSPF'::"Federation"
    WHEN lower('Association Nationale des Premiers Secours (ANPS)') THEN 'ANPS'::"Federation"
    WHEN lower('Union Nationale des Associations de Secouristes et Sauveteurs (UNASS)') THEN 'UNASS'::"Federation"
    WHEN lower('Société Nationale de Sauvetage en Mer (SNSM)') THEN 'SNSM'::"Federation"
    ELSE 'AUTRE'::"Federation"
  END
WHERE "federationName" IS NOT NULL AND trim("federationName") <> '';

-- Le libellé libre ne sert plus qu'au cas AUTRE
UPDATE "Organisme" SET "federationName" = NULL WHERE "federation" IS DISTINCT FROM 'AUTRE';
