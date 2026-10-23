# Signature des attestations par le formateur — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Le formateur affecté à une session trace sa signature au moment de publier ; chaque attestation « acquis » est rendue une fois, stockée chiffrée sur R2 avec son SHA-256, et le stagiaire télécharge ce fichier figé.

**Architecture:** Deux tables (`AttestationSignature`, `SignedAttestation`). Une server action `signAndPublishAttestations` remplace `publishAttestations` : contrôles → rendu `@react-pdf/renderer` avec image du tracé → envoi R2 chiffré → transaction. Une signature active verrouille résultats, inscrits, formateurs et suppression. Dépublier révoque (ligne gardée, fichiers supprimés).

**Tech Stack:** Next.js App Router, Prisma 7 (schéma multi-fichiers `prisma/schema/`), PostgreSQL, Cloudflare R2 (`src/lib/r2.ts`), `@react-pdf/renderer`, `pdf-lib`, `signature_pad`, Vitest.

**Design:** `docs/plans/2026-10-23-attestation-signature-formateur-design.md`

**Conventions projet :**

- `bun` / `bunx` uniquement, jamais npm/npx.
- **Pas de commit** : l'utilisateur gère git. Chaque tâche se termine par un point de contrôle (tests verts), sans `git commit`.
- Commentaires en français, sobres, comme le code voisin.
- Tests : `bun run test -- <chemin>` (Vitest, environnement node, alias `@` → `src`).

---

### Task 1 : Schéma Prisma et migration

**Files:**

- Modify: `prisma/schema/training.prisma` (modèles `TrainingSession`, `Inscription` + 2 nouveaux modèles)
- Modify: `prisma/schema/auth.prisma` (modèle `User`, relations)
- Create: `prisma/migrations/20261023180000_attestation_signature/migration.sql`
- Modify: `src/lib/r2.ts:147-154` (`getStorageKey`)

**Step 1 : Ajouter les modèles** à la fin de `prisma/schema/training.prisma` :

```prisma
model AttestationSignature {
  id                String              @id @default(cuid())
  trainingSessionId String
  signerId          String
  // Figé au moment de signer : un renommage ultérieur ne change pas l'attestation
  signerName        String
  signedAt          DateTime            @default(now())
  ipAddress         String?
  userAgent         String?
  // PNG du tracé sur R2, chiffré
  signatureImageKey String
  // Dépublication : la ligne reste comme trace
  revokedAt         DateTime?
  revokedById       String?
  trainingSession   TrainingSession     @relation(fields: [trainingSessionId], references: [id], onDelete: Cascade)
  signer            User                @relation("AttestationSigner", fields: [signerId], references: [id])
  revokedBy         User?               @relation("AttestationRevoker", fields: [revokedById], references: [id], onDelete: SetNull)
  attestations      SignedAttestation[]

  @@index([trainingSessionId])
}

model SignedAttestation {
  id            String               @id @default(cuid())
  signatureId   String
  inscriptionId String
  // PDF sur R2, chiffré
  fileKey       String
  // SHA-256 du PDF en clair, tel que téléchargé par le stagiaire
  sha256        String
  size          Int
  signature     AttestationSignature @relation(fields: [signatureId], references: [id], onDelete: Cascade)
  inscription   Inscription          @relation(fields: [inscriptionId], references: [id], onDelete: Cascade)

  @@unique([signatureId, inscriptionId])
  @@index([inscriptionId])
}
```

Relations inverses :

- `TrainingSession` (après `documents`) : `attestationSignatures AttestationSignature[]`
- `Inscription` (après `pinLockedUntil`) : `signedAttestations SignedAttestation[]`
- `User` dans `auth.prisma` (après `trainingGroups`) :
  ```prisma
  attestationSignatures  AttestationSignature[] @relation("AttestationSigner")
  attestationRevocations AttestationSignature[] @relation("AttestationRevoker")
  ```

**Step 2 : Valider le schéma**

Run: `bunx prisma validate`
Expected: `The schemas at prisma/schema are valid 🚀`

**Step 3 : Écrire la migration à la main** (le script `db:migrate` est interactif). Générer le SQL de base :

Run: `bunx prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --script > /tmp/diff.sql` puis vérifier que le diff ne contient **que** les deux tables et leurs FK. Copier dans `prisma/migrations/20261023180000_attestation_signature/migration.sql` et ajouter à la fin :

```sql
-- Une seule signature active par session (Prisma ne sait pas exprimer l'index partiel)
CREATE UNIQUE INDEX "AttestationSignature_active_session_key"
  ON "AttestationSignature" ("trainingSessionId")
  WHERE "revokedAt" IS NULL;

-- RLS deny-all comme les autres tables public (cf. 20261006170000_enable_rls_all_public_tables).
ALTER TABLE "AttestationSignature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignedAttestation" ENABLE ROW LEVEL SECURITY;
```

Si `migrate diff` signale une dérive sans rapport (historique local désynchronisé, connu), écrire le SQL à la main sur le modèle de `20261023150000_trainee_portal/migration.sql`.

**Step 4 : Appliquer en local et générer le client**

Run: `bunx prisma migrate deploy && bun run db:generate`
Expected: migration appliquée, client généré. En cas d'historique désynchronisé : `bun run db:push` puis exécuter à la main l'index partiel et les deux `ENABLE ROW LEVEL SECURITY`.

**Step 5 : Étendre `getStorageKey`** (`src/lib/r2.ts:149`) :

```ts
  type: "logo" | "external-trainings" | "session-documents" | "attestations",
```

**Step 6 : Point de contrôle**

Run: `bunx tsc --noEmit`
Expected: aucune erreur.

---

### Task 2 : Validation du PNG de signature

**Files:**

- Create: `src/lib/signature-image.ts`
- Test: `src/lib/signature-image.test.ts`

**Step 1 : Test en échec**

```ts
import { describe, it, expect } from "vitest";
import { parseSignaturePng, MAX_SIGNATURE_BYTES } from "./signature-image";

// PNG 1×1 transparent
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("parseSignaturePng", () => {
  it("returns the decoded PNG", () => {
    const buffer = parseSignaturePng(`data:image/png;base64,${TINY_PNG}`);
    expect(buffer.subarray(0, 4).toString("hex")).toBe("89504e47");
  });

  it("rejects another media type", () => {
    expect(() =>
      parseSignaturePng(`data:image/jpeg;base64,${TINY_PNG}`)
    ).toThrow("Signature invalide.");
  });

  it("rejects malformed base64", () => {
    expect(() => parseSignaturePng("data:image/png;base64,%%%")).toThrow(
      "Signature invalide."
    );
  });

  it("rejects content that is not a PNG", () => {
    const fake = Buffer.from("not a png at all").toString("base64");
    expect(() => parseSignaturePng(`data:image/png;base64,${fake}`)).toThrow(
      "Signature invalide."
    );
  });

  it("rejects an oversized image", () => {
    const big = Buffer.alloc(MAX_SIGNATURE_BYTES + 1).toString("base64");
    expect(() => parseSignaturePng(`data:image/png;base64,${big}`)).toThrow(
      "Signature trop volumineuse."
    );
  });
});
```

**Step 2 :** Run: `bun run test -- src/lib/signature-image.test.ts` — Expected: FAIL (module introuvable).

**Step 3 : Implémentation**

```ts
// Tracé du formateur envoyé par le navigateur (canvas → toDataURL). On ne
// reçoit qu'une image statique : ni points ni vitesses, donc pas de donnée
// biométrique.

const DATA_URL_PREFIX = "data:image/png;base64,";
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const MAX_SIGNATURE_BYTES = 200 * 1024;

export function parseSignaturePng(dataUrl: string): Buffer {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    throw new Error("Signature invalide.");
  }
  const base64 = dataUrl.slice(DATA_URL_PREFIX.length);
  // Tranché avant décodage : pas d'allocation pour une charge démesurée
  if ((base64.length * 3) / 4 > MAX_SIGNATURE_BYTES + 2) {
    throw new Error("Signature trop volumineuse.");
  }
  if (!BASE64_PATTERN.test(base64)) throw new Error("Signature invalide.");

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    throw new Error("Signature trop volumineuse.");
  }
  if (!buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    throw new Error("Signature invalide.");
  }
  return buffer;
}
```

**Step 4 :** Run: `bun run test -- src/lib/signature-image.test.ts` — Expected: PASS (5 tests).

**Step 5 : Point de contrôle.**

---

### Task 3 : Helpers de signature active et verrou

**Files:**

- Create: `src/lib/attestation-signature.ts`
- Test: `src/lib/attestation-signature.test.ts`

**Step 1 : Test en échec**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertAttestationsNotSigned,
  SIGNED_LOCK_MESSAGE,
} from "./attestation-signature";

const mockPrisma = vi.hoisted(() => ({
  attestationSignature: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("assertAttestationsNotSigned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes when no signature is active", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue(null);
    await expect(assertAttestationsNotSigned("s1")).resolves.toBeUndefined();
    expect(mockPrisma.attestationSignature.findFirst).toHaveBeenCalledWith({
      where: { trainingSessionId: "s1", revokedAt: null },
      select: { id: true },
    });
  });

  it("throws when a signature is active", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue({ id: "sig" });
    await expect(assertAttestationsNotSigned("s1")).rejects.toThrow(
      SIGNED_LOCK_MESSAGE
    );
  });
});
```

**Step 2 :** Run: `bun run test -- src/lib/attestation-signature.test.ts` — Expected: FAIL.

**Step 3 : Implémentation**

```ts
import { prisma } from "@/lib/prisma";

// Une session a au plus une signature active (index unique partiel en base).
// Tant qu'elle existe, les données qui alimentent l'attestation sont figées.

export const SIGNED_LOCK_MESSAGE =
  "Attestations signées : dépubliez-les pour modifier.";

export function getActiveSignature(trainingSessionId: string) {
  return prisma.attestationSignature.findFirst({
    where: { trainingSessionId, revokedAt: null },
    include: { attestations: true },
  });
}

export async function assertAttestationsNotSigned(trainingSessionId: string) {
  const active = await prisma.attestationSignature.findFirst({
    where: { trainingSessionId, revokedAt: null },
    select: { id: true },
  });
  if (active) throw new Error(SIGNED_LOCK_MESSAGE);
}
```

**Step 4 :** Run: `bun run test -- src/lib/attestation-signature.test.ts` — Expected: PASS.

**Step 5 : Point de contrôle.**

---

### Task 4 : Rendu PDF signé

**Files:**

- Modify: `src/app/admin/training/lib/pdf-attestation-fin-formation-psc-export.tsx`
- Test: `src/app/admin/training/lib/pdf-attestation-fin-formation-psc-export.test.tsx`

**Step 1 : Test en échec**

```tsx
import { describe, it, expect } from "vitest";
import { extractText } from "unpdf";
import { renderSignedAttestationPDF } from "./pdf-attestation-fin-formation-psc-export";
import type { Inscription } from "../types";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("renderSignedAttestationPDF", () => {
  it("prints the signer, the signing date and the reference", async () => {
    const pdf = await renderSignedAttestationPDF(
      { title: "PSC", location: "Lyon", startDate: null, slots: [] },
      {
        id: "ins-1",
        attestationResult: "acquis",
        attestationValidatedAt: new Date("2026-10-01T10:00:00Z"),
        trainee: { firstName: "Léa", lastName: "MARTIN" },
      } as unknown as Inscription,
      {
        name: "DUPONT Jean",
        signedAt: new Date("2026-10-23T12:05:00Z"),
        signatureId: "sig-123",
        imageDataUrl: TINY_PNG,
      }
    );

    const { text } = await extractText(new Uint8Array(pdf), {
      mergePages: true,
    });
    expect(text).toContain("DUPONT Jean");
    expect(text).toContain("Le, 23/10/2026");
    expect(text).toContain("Signé électroniquement par DUPONT Jean");
    expect(text).toContain("14h05"); // heure de Paris
    expect(text).toContain("sig-123");
  });
});
```

**Step 2 :** Run: `bun run test -- src/app/admin/training/lib/pdf-attestation-fin-formation-psc-export.test.tsx` — Expected: FAIL (`renderSignedAttestationPDF` non exporté).

**Step 3 : Implémentation**

Imports : ajouter `Image` à l'import `@react-pdf/renderer`, et
`import { SLOT_TIMEZONE, formatParisTime } from "@/lib/slot-window";` (étend dayjs avec utc/timezone).

Type, à côté de `AttestationFormateur` :

```ts
export type AttestationSigner = {
  name: string;
  signedAt: Date;
  signatureId: string;
  /** data:image/png;base64,… */
  imageDataUrl: string;
};
```

Dans `AttestationPage`, ajouter la prop `signer?: AttestationSigner` puis :

```tsx
const formateurName =
  signer?.name ||
  `${formateur.lastName ?? ""} ${formateur.firstName ?? ""}`.trim() ||
  "Non renseigné";
// …
// Signée : la date est celle de la signature, pas celle du téléchargement
const validatedAt = signer
  ? dayjs(signer.signedAt).tz(SLOT_TIMEZONE).format("DD/MM/YYYY")
  : inscription.attestationValidatedAt
    ? dayjs(inscription.attestationValidatedAt).format("DD/MM/YYYY")
    : dayjs().format("DD/MM/YYYY");
```

Après le bloc « Signature du Formateur » (ligne ~380) :

```tsx
{
  signer && (
    <>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf, pas un <img> */}
      <Image
        src={signer.imageDataUrl}
        style={{
          position: "absolute",
          left: mm(120),
          top: mm(263),
          width: mm(60),
          height: mm(22),
          objectFit: "contain",
        }}
      />
      <TextAt x={PAGE_WIDTH / 2} y={287} size={8} center>
        {`Signé électroniquement par ${signer.name} le ${dayjs(signer.signedAt).tz(SLOT_TIMEZONE).format("DD/MM/YYYY")} à ${formatParisTime(signer.signedAt)}`}
      </TextAt>
      <TextAt x={PAGE_WIDTH / 2} y={291} size={8} center>
        {`Réf. ${signer.signatureId}`}
      </TextAt>
    </>
  );
}
```

Si la première ligne déborde des 100 mm de `TextAt` centré, passer `centeredWidth` en prop optionnelle (`width = 100`) et utiliser `width={170}` ici.

`AttestationDocument` : ajouter `signer?: AttestationSigner` et le transmettre à chaque `AttestationPage`.

Nouvelle fonction après `renderAttestationPDF` :

```tsx
/** PDF signé : rendu une seule fois, à la signature, puis stocké. */
export async function renderSignedAttestationPDF(
  session: AttestationSession,
  inscription: Inscription,
  signer: AttestationSigner
): Promise<Buffer> {
  return await renderToBuffer(
    <AttestationDocument
      session={session}
      inscriptions={[inscription]}
      formateur={{ lastName: signer.name, firstName: null }}
      signer={signer}
    />
  );
}
```

**Step 4 :** Run le test — Expected: PASS. Vérifier aussi à l'œil : écrire le buffer dans le scratchpad (`fs.writeFileSync`) dans un test temporaire, ouvrir le PDF, contrôler la position de l'image sous « Signature du Formateur ». Retirer ce code ensuite.

**Step 5 : Point de contrôle.**

---

### Task 5 : `signAndPublishAttestations`

**Files:**

- Modify: `src/app/admin/training/actions/attestations.ts` (réécriture)
- Test: `src/app/admin/training/actions/attestations.test.ts`

**Step 1 : Tests en échec**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { signAndPublishAttestations } from "./attestations";
import { requireOrganisme } from "@/lib/context";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const mockPrisma = vi.hoisted(() => ({
  trainingSession: { findFirst: vi.fn(), update: vi.fn() },
  attestationSignature: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));
const mockR2 = vi.hoisted(() => ({
  getStorageKey: vi.fn(
    (org: string, type: string, name: string) =>
      `dev/organisme/${org}/${type}/${name}`
  ),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));
const mockDeliver = vi.hoisted(() => vi.fn());
const mockRender = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/context", () => ({ requireOrganisme: vi.fn() }));
vi.mock("@/lib/r2", () => mockR2);
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn().mockResolvedValue("1.2.3.4"),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "user-agent": "Vitest" })),
}));
vi.mock("@/lib/trainee-access-delivery", () => ({
  deliverAccessToAll: mockDeliver,
}));
vi.mock("../lib/pdf-attestation-fin-formation-psc-export", () => ({
  renderSignedAttestationPDF: mockRender,
}));

const user = {
  id: "u1",
  organismeId: "org-1",
  firstName: "Jean",
  lastName: "DUPONT",
};

function session(overrides = {}) {
  return {
    id: "s1",
    organismeId: "org-1",
    title: "PSC",
    location: "Lyon",
    startDate: null,
    endDate: null,
    slots: [],
    formateurs: [{ userId: "u1" }],
    organisme: { id: "org-1" },
    inscriptions: [
      {
        id: "i1",
        attestationResult: "acquis",
        attestationValidatedAt: new Date(),
        trainee: {},
      },
      {
        id: "i2",
        attestationResult: "non_acquis",
        attestationValidatedAt: new Date(),
        trainee: {},
      },
    ],
    ...overrides,
  };
}

describe("signAndPublishAttestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      user as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
    mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
    mockPrisma.attestationSignature.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockResolvedValue([]);
    mockRender.mockResolvedValue(Buffer.from("pdf-i1"));
  });

  it("refuses a user who is not assigned to the session", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      session({ formateurs: [{ userId: "other" }] })
    );
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("Seul un formateur de la session peut signer.");
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("refuses when results are missing", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      session({
        inscriptions: [{ id: "i1", attestationResult: null, trainee: {} }],
      })
    );
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("1 stagiaire sans résultat.");
  });

  it("refuses when a signature is already active", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue({ id: "sig" });
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("Attestations déjà signées.");
  });

  it("renders only acquis attestations and stores their SHA-256", async () => {
    await signAndPublishAttestations("s1", {
      signaturePng: PNG,
      notify: false,
    });

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockR2.uploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/attestations\/s1\/.+\/i1\.pdf$/),
      Buffer.from("pdf-i1"),
      "application/pdf",
      true
    );
    const create = mockPrisma.attestationSignature.create.mock.calls[0][0];
    expect(create.data).toMatchObject({
      trainingSessionId: "s1",
      signerId: "u1",
      signerName: "DUPONT Jean",
      ipAddress: "1.2.3.4",
      userAgent: "Vitest",
    });
    expect(create.data.attestations.create).toEqual([
      expect.objectContaining({
        inscriptionId: "i1",
        sha256: createHash("sha256").update("pdf-i1").digest("hex"),
        size: 6,
      }),
    ]);
  });

  it("deletes uploaded files when the transaction fails", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("db down"));
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("db down");
    // image du tracé + PDF de i1
    expect(mockR2.deleteFile).toHaveBeenCalledTimes(2);
  });

  it("maps a unique violation (double submit) to a readable error", async () => {
    mockPrisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("Attestations déjà signées.");
  });

  it("notifies only trainees whose attestation is available", async () => {
    mockDeliver.mockResolvedValue({ sent: 1, missingEmail: 0, failed: 0 });
    await signAndPublishAttestations("s1", { signaturePng: PNG, notify: true });
    expect(mockDeliver).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "i1" })],
      expect.objectContaining({ id: "s1" }),
      "attestation"
    );
  });
});
```

**Step 2 :** Run: `bun run test -- src/app/admin/training/actions/attestations.test.ts` — Expected: FAIL.

**Step 3 : Implémentation** — remplacer `publishAttestations` (plus de publication sans signature) :

```ts
"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/rate-limit";
import { getActiveSignature } from "@/lib/attestation-signature";
import { parseSignaturePng } from "@/lib/signature-image";
import { getAttestationState } from "@/lib/trainee-attestation";
import { deliverAccessToAll } from "@/lib/trainee-access-delivery";
import { formatFormateurName } from "../lib/formateurs";
import { renderSignedAttestationPDF } from "../lib/pdf-attestation-fin-formation-psc-export";
import type { Inscription } from "../types";

const UPLOAD_CONCURRENCY = 5;
const ALREADY_SIGNED = "Attestations déjà signées.";

async function findOwnSession(sessionId: string) {
  const user = await requireOrganisme();
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    include: {
      organisme: true,
      inscriptions: { include: { trainee: true } },
      formateurs: { select: { userId: true } },
      slots: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
    },
  });
  if (!session) throw new Error("Session introuvable ou non autorisée");
  return { user, session };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

/** Ce que l'onglet de clôture doit savoir pour proposer la signature. */
export async function getAttestationSigning(sessionId: string) {
  const { user, session } = await findOwnSession(sessionId);
  const active = await getActiveSignature(session.id);
  return {
    isSessionFormateur: session.formateurs.some((f) => f.userId === user.id),
    signerName: formatFormateurName(user),
    signature: active
      ? {
          id: active.id,
          signerName: active.signerName,
          signedAt: active.signedAt,
          inscriptionIds: active.attestations.map((a) => a.inscriptionId),
        }
      : null,
  };
}

export type AttestationSigning = Awaited<
  ReturnType<typeof getAttestationSigning>
>;

/**
 * Signe et publie les attestations d'une session. Chaque PDF « acquis » est
 * rendu une seule fois, stocké chiffré avec son empreinte : le stagiaire
 * télécharge exactement ce fichier. Avec `notify`, seuls les stagiaires dont
 * l'attestation est disponible reçoivent un mail.
 */
export async function signAndPublishAttestations(
  sessionId: string,
  input: { signaturePng: string; notify: boolean }
) {
  const { user, session } = await findOwnSession(sessionId);

  if (!session.formateurs.some((f) => f.userId === user.id)) {
    throw new Error("Seul un formateur de la session peut signer.");
  }
  if (await getActiveSignature(session.id)) throw new Error(ALREADY_SIGNED);

  const missing = session.inscriptions.filter((i) => !i.attestationResult);
  if (missing.length > 0) {
    throw new Error(`${plural(missing.length, "stagiaire")} sans résultat.`);
  }

  const signerName = formatFormateurName(user);
  if (!signerName) {
    throw new Error(
      "Renseignez vos nom et prénom dans votre profil avant de signer."
    );
  }

  const image = parseSignaturePng(input.signaturePng);
  const signedAt = new Date();
  const available = session.inscriptions.filter(
    (i) => getAttestationState(signedAt, i) === "available"
  );
  if (available.length === 0) throw new Error("Aucune attestation à signer.");

  // Identifiant connu avant le rendu : il est imprimé sur chaque PDF
  const signatureId = randomUUID();
  const signer = {
    name: signerName,
    signedAt,
    signatureId,
    imageDataUrl: input.signaturePng,
  };
  const pdfSession = {
    title: session.title,
    location: session.location,
    startDate: session.startDate,
    endDate: session.endDate,
    slots: session.slots,
  };

  const { deleteFile, getStorageKey, uploadFile } = await import("@/lib/r2");
  const prefix = getStorageKey(
    session.organismeId,
    "attestations",
    `${session.id}/${signatureId}/`
  );
  const imageKey = `${prefix}signature.png`;
  const uploaded: string[] = [];

  try {
    await uploadFile(imageKey, image, "image/png", true);
    uploaded.push(imageKey);

    const files = [];
    for (let i = 0; i < available.length; i += UPLOAD_CONCURRENCY) {
      const batch = available.slice(i, i + UPLOAD_CONCURRENCY);
      files.push(
        ...(await Promise.all(
          batch.map(async (inscription) => {
            const pdf = await renderSignedAttestationPDF(
              pdfSession,
              inscription as unknown as Inscription,
              signer
            );
            const fileKey = `${prefix}${inscription.id}.pdf`;
            await uploadFile(fileKey, pdf, "application/pdf", true);
            uploaded.push(fileKey);
            return {
              inscriptionId: inscription.id,
              fileKey,
              sha256: createHash("sha256").update(pdf).digest("hex"),
              size: pdf.length,
            };
          })
        ))
      );
    }

    const requestHeaders = await headers();
    await prisma.$transaction([
      prisma.attestationSignature.create({
        data: {
          id: signatureId,
          trainingSessionId: session.id,
          signerId: user.id,
          signerName,
          signedAt,
          ipAddress: await getClientIp(),
          userAgent: requestHeaders.get("user-agent"),
          signatureImageKey: imageKey,
          attestations: { create: files },
        },
      }),
      prisma.trainingSession.update({
        where: { id: session.id },
        data: { attestationsPublishedAt: signedAt },
      }),
    ]);
  } catch (err) {
    const results = await Promise.allSettled(
      uploaded.map((k) => deleteFile(k))
    );
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      logger.error(
        `Signature ${signatureId} : ${failures} fichier(s) R2 orphelin(s)`
      );
    }
    // Double clic, deux onglets : l'index unique partiel tranche
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(ALREADY_SIGNED);
    }
    throw err;
  }

  if (!input.notify) return { sent: 0, missingEmail: 0, failed: 0 };
  return deliverAccessToAll(available, session, "attestation");
}
```

`unpublishAttestations` est réécrite en Task 6 : la garder telle quelle pour l'instant, en l'adaptant à `findOwnSession` qui renvoie `{ user, session }`.

**Step 4 :** Run le test — Expected: PASS (7 tests). Run: `bunx tsc --noEmit` — l'appel à `publishAttestations` dans `attestations-publication.tsx` casse : attendu, corrigé en Task 11. Mettre temporairement l'appel en commentaire **ou** enchaîner directement.

**Step 5 : Point de contrôle.**

---

### Task 6 : Dépublication = révocation

**Files:**

- Modify: `src/app/admin/training/actions/attestations.ts`
- Test: `src/app/admin/training/actions/attestations.test.ts`

**Step 1 : Tests en échec** (ajouter au fichier ; importer `unpublishAttestations`)

```ts
describe("unpublishAttestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      user as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
    mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
    mockPrisma.$transaction.mockResolvedValue([]);
  });

  it("revokes the active signature and deletes its files", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue({
      id: "sig",
      signatureImageKey: "k/signature.png",
      attestations: [{ fileKey: "k/i1.pdf" }],
    });

    await unpublishAttestations("s1");

    expect(mockPrisma.attestationSignature.update).toHaveBeenCalledWith({
      where: { id: "sig" },
      data: { revokedAt: expect.any(Date), revokedById: "u1" },
    });
    expect(mockR2.deleteFile).toHaveBeenCalledWith("k/signature.png");
    expect(mockR2.deleteFile).toHaveBeenCalledWith("k/i1.pdf");
  });

  it("only unpublishes a session published before signatures existed", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue(null);
    await unpublishAttestations("s1");
    expect(mockPrisma.attestationSignature.update).not.toHaveBeenCalled();
    expect(mockR2.deleteFile).not.toHaveBeenCalled();
  });
});
```

**Step 2 :** Run — Expected: FAIL.

**Step 3 : Implémentation**

```ts
/**
 * Retire les attestations de l'espace stagiaire. La signature est révoquée :
 * la ligne reste (qui, quand, quelles empreintes), les fichiers sont supprimés.
 */
export async function unpublishAttestations(sessionId: string) {
  const { user, session } = await findOwnSession(sessionId);
  const active = await getActiveSignature(session.id);

  await prisma.$transaction([
    prisma.trainingSession.update({
      where: { id: session.id },
      data: { attestationsPublishedAt: null },
    }),
    ...(active
      ? [
          prisma.attestationSignature.update({
            where: { id: active.id },
            data: { revokedAt: new Date(), revokedById: user.id },
          }),
        ]
      : []),
  ]);

  if (!active) return;
  const { deleteFile } = await import("@/lib/r2");
  const keys = [
    active.signatureImageKey,
    ...active.attestations.map((a) => a.fileKey),
  ];
  const results = await Promise.allSettled(keys.map((k) => deleteFile(k)));
  const failures = results.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    logger.error(
      `Révocation ${active.id} : ${failures} fichier(s) R2 non supprimé(s)`
    );
  }
}
```

**Step 4 :** Run — Expected: PASS.

**Step 5 : Point de contrôle.**

---

### Task 7 : Verrous tant qu'une signature est active

**Files:**

- Modify: `src/app/admin/training/actions/inscriptions.ts` (`addTraineeToSession`, `removeTraineeFromSession`, `updateAttestationResult`, `updateAttestationResults`)
- Modify: `src/app/admin/training/services/session.service.ts` (`setFormateurs`, `deleteSession`)
- Test: `src/app/admin/training/actions/inscriptions.test.ts`, `src/app/admin/training/services/session.service.test.ts`

**Step 1 : Tests en échec**

Dans `inscriptions.test.ts`, ajouter `attestationSignature: { findFirst: vi.fn() }` au `mockPrisma` hoisté (une valeur `undefined` par défaut laisse passer les tests existants), puis :

```ts
describe("signed attestations lock", () => {
  beforeEach(() => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue({ id: "sig" });
    mockPrisma.trainingSession.findFirst.mockResolvedValue({
      id: "session-1",
      status: "en_cours",
    });
    mockPrisma.trainingSession.findUnique.mockResolvedValue({
      id: "session-1",
      organismeId: "org-1",
      status: "en_cours",
    });
    mockPrisma.trainee.findFirst.mockResolvedValue({ id: "trainee-1" });
    mockPrisma.inscription.findUnique.mockResolvedValue({
      id: "ins-1",
      trainingSessionId: "session-1",
      trainingSession: { organismeId: "org-1", status: "en_cours" },
    });
  });

  it.each([
    [
      "updateAttestationResult",
      () => updateAttestationResult("ins-1", "acquis"),
    ],
    [
      "updateAttestationResults",
      () => updateAttestationResults("session-1", ["ins-1"], "acquis"),
    ],
    [
      "addTraineeToSession",
      () => addTraineeToSession("session-1", "trainee-1"),
    ],
    ["removeTraineeFromSession", () => removeTraineeFromSession("ins-1")],
  ])("%s refuses while attestations are signed", async (_, run) => {
    await expect(run()).rejects.toThrow(
      "Attestations signées : dépubliez-les pour modifier."
    );
    expect(mockPrisma.inscription.update).not.toHaveBeenCalled();
    expect(mockPrisma.inscription.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.inscription.create).not.toHaveBeenCalled();
    expect(mockPrisma.inscription.delete).not.toHaveBeenCalled();
  });
});
```

Dans `session.service.test.ts`, ajouter `attestationSignature: { findFirst: vi.fn() }` au mock, puis dans `describe("setFormateurs")` et `describe("deleteSession")` un cas « refuse while attestations are signed » (même message, `$transaction` / `trainingSession.delete` non appelés).

**Step 2 :** Run: `bun run test -- src/app/admin/training/actions/inscriptions.test.ts src/app/admin/training/services/session.service.test.ts` — Expected: FAIL sur les nouveaux cas.

**Step 3 : Implémentation** — `import { assertAttestationsNotSigned } from "@/lib/attestation-signature";` puis appeler, juste après le contrôle `isSessionClosed` de chaque fonction :

- `addTraineeToSession` : `await assertAttestationsNotSigned(sessionId);`
- `removeTraineeFromSession`, `updateAttestationResult` : `await assertAttestationsNotSigned(inscription.trainingSessionId);`
- `updateAttestationResults` : `await assertAttestationsNotSigned(sessionId);`
- `setFormateurs` : `await assertAttestationsNotSigned(id);` après le contrôle de statut.
- `deleteSession` : `await assertAttestationsNotSigned(id);` après le contrôle « terminée » (évite des fichiers orphelins : la cascade supprimerait les lignes, pas les PDF).

**Step 4 :** Run — Expected: PASS, y compris les tests existants.

**Step 5 : Point de contrôle.**

---

### Task 8 : Purge RGPD des fichiers signés

**Files:**

- Modify: `src/lib/retention-service.ts` (`purgeExpiredTrainees`)
- Test: `src/lib/retention-service.test.ts`

**Step 1 : Test en échec**

```ts
it("deletes signed attestation files when purging a trainee", async () => {
  vi.mocked(prisma.organisme.findMany).mockResolvedValue([
    { id: "o1", retentionYearsArchive: 10 },
  ] as unknown as Organisme[]);
  vi.mocked(prisma.trainee.findMany).mockResolvedValue([
    {
      id: "t1",
      externalTrainings: [],
      inscriptions: [{ signedAttestations: [{ fileKey: "att/i1.pdf" }] }],
    },
  ] as unknown as Trainee[]);

  await RetentionService.purgeExpiredTrainees();

  expect(deleteFile).toHaveBeenCalledWith("att/i1.pdf");
  expect(prisma.trainee.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
});
```

Les tests de purge existants n'ont pas `inscriptions` : rendre le code tolérant (`trainee.inscriptions ?? []`) n'est pas nécessaire si Prisma renvoie toujours le tableau ; ajouter plutôt `inscriptions: []` aux mocks existants qui passent par la purge.

**Step 2 :** Run: `bun run test -- src/lib/retention-service.test.ts` — Expected: FAIL.

**Step 3 : Implémentation** — dans `purgeExpiredTrainees` :

```ts
        include: {
          externalTrainings: true,
          // La cascade supprime les lignes, pas les PDF signés sur R2
          inscriptions: {
            select: { signedAttestations: { select: { fileKey: true } } },
          },
        },
```

et avant `prisma.trainee.delete`, à côté de la boucle `externalTrainings` :

```ts
const attestationKeys = trainee.inscriptions.flatMap((i) =>
  i.signedAttestations.map((a) => a.fileKey)
);
for (const fileKey of attestationKeys) {
  try {
    await deleteFile(fileKey);
  } catch (error) {
    logger.error(`Erreur suppression attestation R2 ${fileKey}:`, error);
  }
}
```

`anonymizeInactiveTrainees` : **aucun changement** (les PDF sont conservés comme preuve jusqu'à la purge).

**Step 4 :** Run — Expected: PASS.

**Step 5 : Point de contrôle.**

---

### Task 9 : Téléchargement stagiaire du fichier signé

**Files:**

- Modify: `src/app/espace/sessions/[inscriptionId]/attestation/route.ts`

**Step 1 : Implémentation** — après le contrôle `getAttestationState` (ligne ~35), avant le rendu à la volée :

```ts
const fileName = attestationFileName(inscription as unknown as Inscription);
const signed = await prisma.signedAttestation.findFirst({
  where: { inscriptionId: inscription.id, signature: { revokedAt: null } },
});
if (signed) {
  try {
    const { getFile } = await import("@/lib/r2");
    const { buffer } = await getFile(signed.fileKey, true);
    return pdfResponse(buffer, fileName);
  } catch (error) {
    logger.error(`Attestation signée ${signed.id} illisible sur R2`, error);
    return new NextResponse("Attestation indisponible", { status: 404 });
  }
}
// Signature active sans fichier pour ce stagiaire : jamais de version non signée
if (await getActiveSignature(inscription.trainingSessionId)) {
  return new NextResponse("Attestation indisponible", { status: 404 });
}
// Sinon : session publiée avant la signature, rendu à la volée comme avant
```

Extraire la réponse existante (lignes 71-77) en helper local :

```ts
function pdfResponse(pdf: Buffer, fileName: string) {
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
```

Mettre à jour le commentaire d'en-tête : « Attestation PDF du stagiaire : fichier signé et stocké ; rendu à la volée pour les sessions publiées avant la signature. »

**Step 2 : Vérification** — `bunx tsc --noEmit` ; test manuel en Task 13.

**Step 3 : Point de contrôle.**

---

### Task 10 : Téléchargement admin des PDF signés

**Files:**

- Create: `src/app/api/admin/attestations/[sessionId]/route.ts`

**Step 1 : Implémentation**

```ts
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { requireOrganisme } from "@/lib/context";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getActiveSignature } from "@/lib/attestation-signature";

/**
 * PDF signés d'une session : `?inscription=<id>` pour un stagiaire, sinon
 * tous fusionnés. La fusion est une copie de travail : la référence reste le
 * fichier individuel et son empreinte.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await requireOrganisme();
  const { sessionId } = await params;

  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    select: {
      id: true,
      title: true,
      inscriptions: {
        select: {
          id: true,
          trainee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  const signature = session ? await getActiveSignature(session.id) : null;
  if (!session || !signature) {
    return new NextResponse("Attestations non signées", { status: 404 });
  }

  const inscriptionId = req.nextUrl.searchParams.get("inscription");
  const files = inscriptionId
    ? signature.attestations.filter((a) => a.inscriptionId === inscriptionId)
    : signature.attestations;
  if (files.length === 0) {
    return new NextResponse("Attestation introuvable", { status: 404 });
  }

  try {
    const { getFile } = await import("@/lib/r2");
    const buffers = await Promise.all(
      files.map(async (f) => (await getFile(f.fileKey, true)).buffer)
    );

    let body: Uint8Array;
    let fileName: string;
    if (inscriptionId) {
      const trainee = session.inscriptions.find(
        (i) => i.id === inscriptionId
      )?.trainee;
      body = new Uint8Array(buffers[0]);
      fileName = `Attestation_${trainee?.lastName}_${trainee?.firstName}.pdf`;
    } else {
      const merged = await PDFDocument.create();
      for (const buffer of buffers) {
        const source = await PDFDocument.load(buffer);
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      body = await merged.save();
      fileName = `Attestations_${session.title.replace(/\s+/g, "_")}.pdf`;
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error(
      `Attestations signées ${signature.id} illisibles sur R2`,
      error
    );
    return new NextResponse("Attestations indisponibles", { status: 500 });
  }
}
```

Le nom de fichier individuel reprend le format de `attestationFileName` (`pdf-attestation-fin-formation-psc-export.tsx:421`) : si ce helper accepte un objet `{ trainee }` minimal sans cast, l'utiliser à la place.

**Step 2 :** `bunx tsc --noEmit` — Expected: aucune erreur dans ce fichier.

**Step 3 : Point de contrôle.**

---

### Task 11 : Composant `SignaturePad` et dialogue « Signer et publier »

**Files:**

- Run: `bun add signature_pad@5.0.4`
- Create: `src/app/admin/training/sessions/[id]/components/close/signature-pad.tsx`
- Modify: `src/app/admin/training/sessions/[id]/components/close/attestations-publication.tsx`

**Step 1 : Dépendance**

Run: `bun add signature_pad@5.0.4`
Expected: ajoutée à `package.json`, version exacte.

**Step 2 : `signature-pad.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePadLib from "signature_pad";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Zone de tracé. Ne remonte qu'une image PNG (jamais les points ni leurs
 * horodatages) : la signature reste une image statique, non biométrique.
 */
export function SignaturePad({
  onChange,
  disabled = false,
}: {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  // Le parent passe souvent une fonction recréée à chaque rendu
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePadLib(canvas, { penColor: "black" });
    padRef.current = pad;

    // Canvas à la densité de l'écran, sinon tracé flou sur mobile
    function resize() {
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
      setEmpty(true);
      onChangeRef.current(null);
    }

    function handleEnd() {
      const isEmpty = pad.isEmpty();
      setEmpty(isEmpty);
      onChangeRef.current(isEmpty ? null : pad.toDataURL("image/png"));
    }

    resize();
    pad.addEventListener("endStroke", handleEnd);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      pad.removeEventListener("endStroke", handleEnd);
      pad.off();
    };
  }, []);

  useEffect(() => {
    if (disabled) padRef.current?.off();
    else padRef.current?.on();
  }, [disabled]);

  function clear() {
    padRef.current?.clear();
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      {/* Fond blanc dans les deux thèmes : l'encre noire est celle du PDF */}
      <canvas
        ref={canvasRef}
        aria-label="Zone de signature"
        className="h-40 w-full touch-none rounded-md border bg-white"
      />
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Signez avec le doigt, un stylet ou la souris.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={disabled || empty}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
          Effacer
        </Button>
      </div>
    </div>
  );
}
```

**Step 3 : `attestations-publication.tsx`**

- Props : ajouter `signing: AttestationSigning` (type exporté par `actions/attestations.ts`, importé via `@/app/admin/training/actions`).
- Import : `signAndPublishAttestations` à la place de `publishAttestations` ; `SignaturePad` ; icône `PenLine` à la place de `Send`.
- État : `const [signaturePng, setSignaturePng] = useState<string | null>(null);` et `const [unpublishOpen, setUnpublishOpen] = useState(false);`
- Règle d'accès :

```tsx
const blockedReason = !signing.isSessionFormateur
  ? "Seul un formateur affecté à la session peut signer les attestations."
  : missingResult.length > 0
    ? `${plural(missingResult.length, "stagiaire")} sans résultat : complétez Clôturer › Résultats.`
    : null;
```

- `publish()` appelle `signAndPublishAttestations(sessionId, { signaturePng: signaturePng!, notify })`, toasts identiques en remplaçant « Attestations publiées » par « Attestations signées et publiées ».
- Description publiée : `Signées par {signing.signature.signerName} le {dayjs(signing.signature.signedAt).format("DD/MM [à] HH:mm")} · …` quand `signing.signature` existe, texte actuel sinon (sessions publiées avant la fonctionnalité).
- Bouton principal : libellé **« Signer et publier »**, `disabled={pending || available.length === 0 || blockedReason !== null}` ; sous l'en-tête, si `blockedReason`, un `<p className="text-muted-foreground text-sm">{blockedReason}</p>` dans `CardContent`.
- Dialogue de signature (remplace le contenu de l'`AlertDialog` existant) :
  - titre « Signer les attestations ? » ;
  - description « Vous signez {plural(available.length, "attestation")} en tant que **{signing.signerName}**. Chaque attestation est figée : pour corriger un résultat, il faudra dépublier puis signer à nouveau. » ;
  - `<SignaturePad onChange={setSignaturePng} disabled={pending} />` ;
  - case « Prévenir par email » inchangée ;
  - `AlertDialogAction` : libellé « Signer et publier », `disabled={!signaturePng || pending}`.
  - À la fermeture (`onOpenChange(false)`), remettre `signaturePng` à `null`.
- « Dépublier » ouvre un second `AlertDialog` : « Dépublier les attestations ? — La signature est révoquée et les PDF signés supprimés. Les stagiaires ne pourront plus télécharger leur attestation tant que vous n'aurez pas signé à nouveau. » → `unpublish()`.

**Step 4 :** `bunx tsc --noEmit` — Expected: erreurs restantes uniquement sur le passage de `signing` (Task 12).

**Step 5 : Point de contrôle.**

---

### Task 12 : Branchement page → workspace → documents

**Files:**

- Modify: `src/app/admin/training/sessions/[id]/page.tsx`
- Modify: `src/app/admin/training/sessions/components/session-workspace.tsx`
- Modify: `src/app/admin/training/sessions/[id]/components/close/documents-section.tsx`

**Step 1 : `page.tsx`** — ajouter `getAttestationSigning(id)` au `Promise.all` (import depuis `../../actions`), et passer `attestationSigning={attestationSigning}` à `SessionWorkspace`.

**Step 2 : `session-workspace.tsx`** — prop `attestationSigning: AttestationSigning` dans `SessionWorkspaceProps`, transmise à `DocumentsSection` (ligne ~244).

**Step 3 : `documents-section.tsx`**

- Prop `signing: AttestationSigning`, transmise à `AttestationsPublication` (`signing={signing}`).
- Constante :

```tsx
// Signées : on sert les PDF figés, jamais un nouveau rendu
const signedIds = new Set(signing.signature?.inscriptionIds ?? []);
const signedUrl = (inscriptionId?: string) =>
  `/api/admin/attestations/${session.id}${inscriptionId ? `?inscription=${inscriptionId}` : ""}`;
```

- Carte « Attestations de fin de formation » :
  - signée → `description: "Versions signées, en un seul PDF."`, `disabled: signedIds.size === 0`, `run: () => { window.location.href = signedUrl(); }` ;
  - non signée → titre « Attestations (aperçu non signé) », comportement actuel.
- Bouton « Attestation » par stagiaire (ligne ~245) : si `signedIds.has(inscription.id)`, `window.location.href = signedUrl(inscription.id)` ; si signature active mais stagiaire non « acquis », garder l'aperçu actuel ; sinon libellé `aria-label` « Aperçu non signé de l'attestation de {name} ».

**Step 4 :** `bunx tsc --noEmit && bun run lint` — Expected: aucune erreur.

**Step 5 : Point de contrôle.**

---

### Task 13 : Vérification complète

**Step 1 : Suite de tests**

Run: `bun run test`
Expected: tout vert.

**Step 2 : Types et lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: aucune erreur.

**Step 3 : Parcours manuel** (`bun run dev`, skill `run` si besoin) :

1. Session avec 2 stagiaires (1 acquis, 1 non acquis), connecté en formateur **affecté** → onglet Clôturer › Documents → « Signer et publier » actif.
2. Tracer, valider avec « Prévenir par email » décoché → toast « Attestations signées et publiées », description « Signées par … ».
3. Résultats : changer un résultat → toast « Attestations signées : dépubliez-les pour modifier. »
4. Espace stagiaire (lien d'accès du stagiaire acquis) → télécharger l'attestation : nom du formateur seul, date de signature, image du tracé, pied « Signé électroniquement … Réf. … ».
5. Télécharger deux fois → `shasum -a 256` identique, et égal à `SignedAttestation.sha256` (`bun run db:studio`).
6. Admin : bouton individuel et carte « toutes » → PDF signés.
7. Connecté en admin **non affecté** → bouton désactivé avec explication.
8. « Dépublier » → confirmation → `revokedAt` renseigné, objets R2 supprimés, résultats de nouveau modifiables, l'espace stagiaire affiche « en attente ».
9. Double-clic rapide sur « Signer et publier » (ou deux onglets) → une seule signature active, l'autre reçoit « Attestations déjà signées. »
10. Mobile (largeur 375 px, devtools) : tracé net, pas de défilement de page pendant le tracé.

**Step 4 : Changelog** — si le projet tient `src/data/changelog.ts` pour les fonctionnalités visibles, ajouter une entrée « Signature des attestations par le formateur » sur le modèle des précédentes.

**Step 5 : Point de contrôle final** — résumer à l'utilisateur les fichiers modifiés ; il commite lui-même.
