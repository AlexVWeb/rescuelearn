# Analyse des référentiels en sujets — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pré-analyser chaque PDF de référentiel une seule fois pour obtenir une carte de sujets (granularité « fiche technique ») stockée en base, puis générer quiz et parcours Duolingo à partir de ces sujets plutôt que d'un texte libre.

**Architecture:** Une analyse asynchrone (`after()` de Next) lit le sommaire du PDF (signets via `unpdf`, sinon Gemini), découpe le PDF par chapitre (`pdf-lib`) et demande à Gemini les sujets de chaque chapitre. Les sujets (`ReferencielTopic`) portent leurs plages de pages : la génération de quiz / leçons n'envoie plus que les pages utiles. Les questions et nœuds de parcours sont liés aux sujets → tableau de couverture.

**Tech Stack:** Next.js 16 (App Router, server actions, `after`), Prisma (schéma multi-fichiers `prisma/schema/`), `@google/genai`, `unpdf`, `pdf-lib`, Vitest, bun.

---

## Décisions validées

| Sujet                  | Décision                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Granularité            | 1 sujet = 1 fiche technique. 1 nœud de parcours = 1 à 3 sujets.                                                                                                                                             |
| Niveaux                | `levels String[]` sur `Referenciel` (GQS, PSC, SST, FORMATEUR = 1 niveau ; PSE = `["PSE1","PSE2"]`). `levels` aussi sur `ReferencielTopic` : copié du référentiel si mono-niveau, déterminé par l'IA sinon. |
| Relecture admin        | Optionnelle. Flag `validated` informatif ; la génération n'est jamais bloquée.                                                                                                                              |
| Prérequis entre sujets | Hors scope (YAGNI) : l'ordre du référentiel (`order`) suffit.                                                                                                                                               |
| Ré-analyse             | Upsert par `slug` → les sujets inchangés gardent leur id et leur couverture. Sujets disparus supprimés (liens `SetNull`).                                                                                   |

## Conventions projet

- Toujours `bun` / `bunx` (jamais npm/npx).
- **Pas de commit** : l'utilisateur gère git. Les étapes « Commit » sont remplacées par « Checkpoint : `bun run test` + `bun run type-check` verts ».
- Tests dans `src/__tests__/`, style des mocks : voir `src/__tests__/ai-quiz-actions.test.ts` et `src/__tests__/gemini.test.ts`.
- Lancer un test : `bunx vitest run src/__tests__/<fichier>.test.ts`.

---

## Phase 1 — Fondations

### Task 1 : Dépendances

**Step 1 :** `bun add unpdf pdf-lib`

**Step 2 :** Vérifier : `grep -E '"(unpdf|pdf-lib)"' package.json` → deux lignes.

### Task 2 : Schéma Prisma

**Files:**

- Modify: `prisma/schema/learning.prisma`
- Modify: `prisma/schema/quiz.prisma` (model `Question`)
- Modify: `prisma/schema/progression.prisma` (models `ProgressionTree`, `ProgressionNode`)

**Step 1 : `learning.prisma`** — remplacer `Referenciel` et ajouter le modèle + enum :

```prisma
model Referenciel {
  id                    Int                @id @default(autoincrement())
  title                 String
  pdfUrl                String
  yearEdition           Int
  levels                String[]           @default([])
  analysisStatus        AnalysisStatus     @default(NONE)
  analysisStartedAt     DateTime?
  analyzedAt            DateTime?
  analysisError         String?
  analysisDoneChapters  Int                @default(0)
  analysisTotalChapters Int                @default(0)
  learningCards         LearningCard[]
  quizzes               Quiz[]
  topics                ReferencielTopic[]
  progressionTrees      ProgressionTree[]
}

enum AnalysisStatus {
  NONE
  PROCESSING
  DONE
  FAILED
}

// Sujet pédagogique (≈ fiche technique) extrait d'un référentiel PDF
model ReferencielTopic {
  id               String            @id @default(cuid())
  referencielId    Int
  referenciel      Referenciel       @relation(fields: [referencielId], references: [id], onDelete: Cascade)
  slug             String // slugify(chapter + title), stable entre deux analyses
  chapter          String
  title            String
  summary          String            @db.Text
  keyPoints        String[]          @default([])
  pageStart        Int // 1-based, pages du PDF complet
  pageEnd          Int
  levels           String[]          @default([])
  order            Int
  questionCapacity Int               @default(5)
  suggestedFormats String[]          @default([])
  validated        Boolean           @default(false)
  questions        Question[]
  progressionNodes ProgressionNode[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@unique([referencielId, slug])
  @@index([referencielId, order])
}
```

**Step 2 : `quiz.prisma`**, dans `model Question` ajouter :

```prisma
  topicId              String?
  topic                ReferencielTopic?         @relation(fields: [topicId], references: [id], onDelete: SetNull)
```

**Step 3 : `progression.prisma`** :

- `ProgressionTree` : ajouter
  ```prisma
  referencielId Int?
  referenciel   Referenciel? @relation(fields: [referencielId], references: [id], onDelete: SetNull)
  ```
- `ProgressionNode` : ajouter (relation implicite many-to-many)
  ```prisma
  topics ReferencielTopic[]
  ```

**Step 4 :** `bun run validate` → `The schemas at prisma/schema are valid`.

**Step 5 :** Migration : `bunx prisma migrate dev --name referenciel_topics`. Si l'historique est désynchronisé (problème connu `20260311221220_enable_realtime`), utiliser `bun run db:push` en local et générer la migration plus tard.

**Step 6 :** `bun run db:generate` puis `bun run type-check` → vert.

### Task 3 : Utilitaires PDF purs (TDD)

**Files:**

- Create: `src/lib/pdf/chapters.ts`
- Test: `src/__tests__/pdf-chapters.test.ts`

**Step 1 : test qui échoue**

```ts
import { describe, it, expect } from "vitest";
import {
  outlineToChapters,
  mergePageRanges,
  slugify,
} from "@/lib/pdf/chapters";

describe("outlineToChapters", () => {
  it("transforme les entrées de niveau 0 en chapitres bornés par l'entrée suivante", () => {
    const chapters = outlineToChapters(
      [
        { title: "Intro", depth: 0, pageIndex: 0 },
        { title: "Protection", depth: 0, pageIndex: 4 },
        { title: "Alerte", depth: 0, pageIndex: 9 },
        { title: "Hémorragies", depth: 0, pageIndex: 14 },
      ],
      20
    );
    expect(chapters).toEqual([
      { title: "Intro", pageStart: 1, pageEnd: 4 },
      { title: "Protection", pageStart: 5, pageEnd: 9 },
      { title: "Alerte", pageStart: 10, pageEnd: 14 },
      { title: "Hémorragies", pageStart: 15, pageEnd: 20 },
    ]);
  });

  it("descend au niveau 1 quand le niveau 0 a moins de 4 entrées", () => {
    const chapters = outlineToChapters(
      [
        { title: "Partie 1", depth: 0, pageIndex: 0 },
        { title: "A", depth: 1, pageIndex: 0 },
        { title: "B", depth: 1, pageIndex: 3 },
        { title: "C", depth: 1, pageIndex: 6 },
        { title: "D", depth: 1, pageIndex: 8 },
      ],
      10
    );
    expect(chapters.map((c) => c.title)).toEqual(["A", "B", "C", "D"]);
  });

  it("découpe les chapitres trop longs en fenêtres de maxPages", () => {
    const chapters = outlineToChapters(
      [
        { title: "A", depth: 0, pageIndex: 0 },
        { title: "B", depth: 0, pageIndex: 1 },
        { title: "C", depth: 0, pageIndex: 2 },
        { title: "Gros", depth: 0, pageIndex: 3 },
      ],
      100,
      40
    );
    expect(chapters.slice(3)).toEqual([
      { title: "Gros (1/3)", pageStart: 4, pageEnd: 43 },
      { title: "Gros (2/3)", pageStart: 44, pageEnd: 83 },
      { title: "Gros (3/3)", pageStart: 84, pageEnd: 100 },
    ]);
  });

  it("retourne [] si moins de 4 entrées exploitables", () => {
    expect(
      outlineToChapters([{ title: "X", depth: 0, pageIndex: 0 }], 5)
    ).toEqual([]);
  });
});

describe("mergePageRanges", () => {
  it("fusionne les plages qui se chevauchent ou se touchent", () => {
    expect(
      mergePageRanges([
        { pageStart: 10, pageEnd: 12 },
        { pageStart: 1, pageEnd: 3 },
        { pageStart: 4, pageEnd: 5 },
        { pageStart: 11, pageEnd: 15 },
      ])
    ).toEqual([
      { pageStart: 1, pageEnd: 5 },
      { pageStart: 10, pageEnd: 15 },
    ]);
  });
});

describe("slugify", () => {
  it("supprime accents et ponctuation", () => {
    expect(slugify("Ch. 3 — Hémorragie externe !")).toBe(
      "ch-3-hemorragie-externe"
    );
  });
});
```

**Step 2 :** `bunx vitest run src/__tests__/pdf-chapters.test.ts` → FAIL (module introuvable).

**Step 3 : implémentation**

```ts
export type OutlineEntry = { title: string; depth: number; pageIndex: number };
export type PageRange = { pageStart: number; pageEnd: number };
export type Chapter = PageRange & { title: string };

const MIN_CHAPTERS = 4;

export function outlineToChapters(
  entries: OutlineEntry[],
  numPages: number,
  maxPages = 40
): Chapter[] {
  const atDepth = (d: number) =>
    entries
      .filter((e) => e.depth === d)
      .sort((a, b) => a.pageIndex - b.pageIndex);

  let picked = atDepth(0);
  if (picked.length < MIN_CHAPTERS) picked = atDepth(1);
  if (picked.length < MIN_CHAPTERS) return [];

  const chapters: Chapter[] = [];
  picked.forEach((entry, i) => {
    const pageStart = entry.pageIndex + 1;
    const next = picked[i + 1];
    const pageEnd = next ? Math.max(pageStart, next.pageIndex) : numPages;
    const length = pageEnd - pageStart + 1;
    const parts = Math.ceil(length / maxPages);
    for (let p = 0; p < parts; p++) {
      chapters.push({
        title: parts > 1 ? `${entry.title} (${p + 1}/${parts})` : entry.title,
        pageStart: pageStart + p * maxPages,
        pageEnd: Math.min(pageEnd, pageStart + (p + 1) * maxPages - 1),
      });
    }
  });
  return chapters;
}

export function mergePageRanges(ranges: PageRange[]): PageRange[] {
  const sorted = [...ranges].sort((a, b) => a.pageStart - b.pageStart);
  const merged: PageRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.pageStart <= last.pageEnd + 1) {
      last.pageEnd = Math.max(last.pageEnd, r.pageEnd);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

**Step 4 :** relancer → PASS.

### Task 4 : Lecture du sommaire et extraction de pages (TDD)

**Files:**

- Create: `src/lib/pdf/document.ts`
- Test: `src/__tests__/pdf-document.test.ts`

**Step 1 : test** (pdf-lib génère de vrais PDF, pas de mock)

```ts
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { extractPages, readPdfOutline } from "@/lib/pdf/document";

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage();
  return doc.save();
}

describe("extractPages", () => {
  it("garde uniquement les plages demandées (1-based, inclusives)", async () => {
    const src = await makePdf(10);
    const out = await extractPages(src, [
      { pageStart: 2, pageEnd: 3 },
      { pageStart: 8, pageEnd: 8 },
    ]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
  });

  it("borne les plages hors limites", async () => {
    const out = await extractPages(await makePdf(5), [
      { pageStart: 4, pageEnd: 99 },
    ]);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2);
  });
});

describe("readPdfOutline", () => {
  it("retourne numPages et un sommaire vide pour un PDF sans signets", async () => {
    const res = await readPdfOutline(await makePdf(3));
    expect(res).toEqual({ numPages: 3, entries: [] });
  });
});
```

**Step 2 :** lancer → FAIL.

**Step 3 : implémentation**

```ts
import { PDFDocument } from "pdf-lib";
import { getDocumentProxy } from "unpdf";
import type { OutlineEntry, PageRange } from "./chapters";

export async function extractPages(
  pdf: Uint8Array,
  ranges: PageRange[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(pdf);
  const total = src.getPageCount();
  const indices: number[] = [];
  for (const { pageStart, pageEnd } of ranges) {
    for (let p = Math.max(1, pageStart); p <= Math.min(total, pageEnd); p++) {
      indices.push(p - 1);
    }
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((page) => out.addPage(page));
  return out.save();
}

type RawOutlineItem = {
  title: string;
  dest: string | unknown[] | null;
  items: RawOutlineItem[];
};

export async function readPdfOutline(
  pdf: Uint8Array
): Promise<{ numPages: number; entries: OutlineEntry[] }> {
  // unpdf/pdf.js détache le buffer : on lui passe une copie
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const outline = ((await doc.getOutline()) ?? []) as RawOutlineItem[];
  const entries: OutlineEntry[] = [];

  const walk = async (items: RawOutlineItem[], depth: number) => {
    if (depth > 1) return;
    for (const item of items) {
      try {
        const dest =
          typeof item.dest === "string"
            ? await doc.getDestination(item.dest)
            : item.dest;
        if (Array.isArray(dest) && dest[0]) {
          const pageIndex = await doc.getPageIndex(
            dest[0] as Parameters<typeof doc.getPageIndex>[0]
          );
          entries.push({ title: item.title.trim(), depth, pageIndex });
        }
      } catch {
        // signet cassé : ignoré
      }
      await walk(item.items ?? [], depth + 1);
    }
  };
  await walk(outline, 0);

  return { numPages: doc.numPages, entries };
}
```

**Step 4 :** relancer → PASS. Bonus manuel : lancer `readPdfOutline` sur un vrai référentiel PSE pour vérifier que les signets sont exploitables (script jetable dans le scratchpad, pas dans le repo).

### Task 5 : Factoriser chargement PDF + envoi à Gemini

Aujourd'hui le bloc « R2 → fichier temporaire » est copié 3 fois (`ai-quiz-actions.ts`, `progression.service.ts` ×2) et le bloc « inline < 15 Mo sinon Files API » 3 fois (`gemini/quiz.ts`, `gemini/progression.ts` ×2). On les remplace par deux helpers qui travaillent en mémoire (plus de fichier temporaire).

**Files:**

- Create: `src/lib/referenciel-pdf.ts`
- Create: `src/lib/gemini/pdf-part.ts`
- Modify: `src/lib/gemini/quiz.ts`, `src/lib/gemini/progression.ts` (param `pdfPath: string` → `pdf: Uint8Array`)
- Modify: `src/app/actions/ai-quiz-actions.ts`, `src/services/progression.service.ts`
- Modify: `src/__tests__/gemini.test.ts`, `src/__tests__/ai-quiz-actions.test.ts`, `src/__tests__/progression-actions.test.ts` (adapter les appels)

**Step 1 : `src/lib/referenciel-pdf.ts`**

```ts
import { readFile } from "fs/promises";
import path from "path";

export async function loadReferencielPdf(pdfUrl: string): Promise<Uint8Array> {
  if (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")) {
    const key = pdfUrl.replace(`${process.env.R2_PUBLIC_URL}/`, "");
    const { getFile } = await import("@/lib/r2");
    const { buffer } = await getFile(key, false);
    return new Uint8Array(buffer);
  }
  return new Uint8Array(
    await readFile(path.join(process.cwd(), "public", pdfUrl))
  );
}
```

**Step 2 : `src/lib/gemini/pdf-part.ts`**

```ts
import type { Part } from "@google/genai";
import { logger } from "../logger";
import { getAiClient } from "./client";

const INLINE_LIMIT_MB = 15;

export async function withPdfPart<T>(
  pdf: Uint8Array,
  fn: (part: Part) => Promise<T>
): Promise<T> {
  const ai = getAiClient();
  const sizeMB = pdf.byteLength / (1024 * 1024);

  if (sizeMB < INLINE_LIMIT_MB) {
    logger.info(`PDF is small (${sizeMB.toFixed(2)} MB), sending inline...`);
    return fn({
      inlineData: {
        data: Buffer.from(pdf).toString("base64"),
        mimeType: "application/pdf",
      },
    });
  }

  logger.info(
    `PDF is large (${sizeMB.toFixed(2)} MB), uploading to Gemini Files API...`
  );
  const uploaded = await ai.files.upload({
    file: new Blob([pdf], { type: "application/pdf" }),
    config: { mimeType: "application/pdf" },
  });
  if (!uploaded.name) throw new Error("Upload failed: file name is undefined");

  try {
    let state = uploaded.state;
    while (state === "PROCESSING") {
      await new Promise((r) => setTimeout(r, 1000));
      state = (await ai.files.get({ name: uploaded.name })).state;
    }
    if (state !== "ACTIVE")
      throw new Error(`Uploaded file is not active: ${state}`);
    return await fn({
      fileData: { fileUri: uploaded.uri, mimeType: "application/pdf" },
    });
  } finally {
    try {
      await ai.files.delete({ name: uploaded.name });
    } catch (err) {
      logger.error(`Failed to delete uploaded file ${uploaded.name}:`, err);
    }
  }
}
```

**Step 3 :** Dans `generateQuizFromPdf`, `generateProgressionNodeFromPdf`, `generateEntireTreeFromPdf` : remplacer `pdfPath: string` par `pdf: Uint8Array`, supprimer `stat`/`readFile`/upload/finally, et envelopper l'appel : `return withPdfPart(pdf, async (pdfPart) => { ... contents: [pdfPart, promptText] ... })`.

**Step 4 :** Dans `ai-quiz-actions.ts` et `progression.service.ts` : remplacer les blocs temp-file par `const pdf = await loadReferencielPdf(referenciel.pdfUrl);` et supprimer les `finally { unlink }`.

**Step 5 :** Adapter les tests : mocks `fs/promises` (`stat`, `readFile`) → passer directement `pdf: new Uint8Array(N)` (petit = inline ; pour le cas « large », `new Uint8Array(16 * 1024 * 1024)`). Dans les tests d'actions, mocker `@/lib/referenciel-pdf`.

**Step 6 :** `bun run test` + `bun run type-check` → vert. Checkpoint.

---

## Phase 2 — Analyse du référentiel

### Task 6 : Prompts et appels Gemini d'analyse (TDD)

**Files:**

- Create: `src/lib/gemini/analysis.ts`
- Modify: `src/lib/gemini.ts` (exports)
- Test: `src/__tests__/gemini-analysis.test.ts`

**Contrat :**

```ts
export const SUGGESTED_FORMATS = [
  "QUIZ",
  "MICRO_COURSE",
  "FLASHCARD",
  "MINI_GAME",
] as const;

export type AnalyzedTopic = {
  title: string;
  summary: string;
  keyPoints: string[];
  pageStart: number; // relatif à l'extrait (1-based)
  pageEnd: number;
  levels: string[];
  questionCapacity: number;
  suggestedFormats: string[];
};

export function buildChapterPlanPrompt(): string;
export function buildTopicsPrompt(args: {
  referencielTitle: string;
  chapter: { title: string; pageStart: number; pageEnd: number };
  levels: string[];
}): string;

// Fallback quand le PDF n'a pas de signets exploitables
export async function analyzeChapterPlan(pdf: Uint8Array): Promise<Chapter[]>;
// pdf = extrait du chapitre seulement
export async function analyzeChapterTopics(args: {
  pdf: Uint8Array;
  referencielTitle: string;
  chapter: Chapter;
  levels: string[];
}): Promise<AnalyzedTopic[]>;
```

**Step 1 : tests** (même mock `@google/genai` que `gemini.test.ts`)

- `buildTopicsPrompt` contient le titre du chapitre, « fiche technique », et la liste des niveaux **seulement** si `levels.length > 1`.
- `analyzeChapterTopics` : `generateContent` mocké renvoie `{ topics: [...] }` → retourne le tableau ; vérifier que `responseSchema.properties.topics.items.properties.levels.items.enum` vaut `["PSE1","PSE2"]` quand `levels = ["PSE1","PSE2"]`, et que `levels` est absent du schéma quand mono-niveau.
- `analyzeChapterPlan` : réponse `{ chapters: [{ title, pageStart, pageEnd }] }` → retournée telle quelle.

**Step 2 :** FAIL.

**Step 3 : implémentation (prompts clés)**

```ts
export function buildTopicsPrompt({ referencielTitle, chapter, levels }: {...}): string {
  const levelRule =
    levels.length > 1
      ? `\n- "levels" : sous-ensemble de ${JSON.stringify(levels)} indiquant à quelle(s) formation(s) le sujet appartient (d'après les mentions explicites du document ; si non précisé, mets tous les niveaux).`
      : "";
  return `Tu es un expert en secourisme et en ingénierie pédagogique.
Le document fourni est un extrait du référentiel "${referencielTitle}" : chapitre "${chapter.title}" (pages ${chapter.pageStart} à ${chapter.pageEnd} du référentiel complet). La page 1 de l'extrait correspond à la page ${chapter.pageStart}.

Découpe ce chapitre en sujets pédagogiques au niveau "fiche technique" : un sujet = une notion, un geste ou une conduite à tenir autonome (ex : "Garrot", "Compression manuelle", "PLS chez l'adulte"). Ignore sommaires, pages de garde, index et pages blanches.

Pour chaque sujet :
- "title" : titre court, tel qu'il apparaît dans le document si possible.
- "summary" : 2 à 4 phrases factuelles.
- "keyPoints" : 3 à 8 notions clés à retenir (chiffres, étapes, critères).
- "pageStart" / "pageEnd" : pages DE L'EXTRAIT (1-based) couvrant le sujet.
- "questionCapacity" : nombre de questions QCM distinctes et non triviales que le contenu permet (1 à 30).
- "suggestedFormats" : parmi ${JSON.stringify(SUGGESTED_FORMATS)} ; MINI_GAME uniquement si le sujet décrit une procédure ordonnée.${levelRule}

Règles : uniquement le contenu du document, rien d'inventé. Tout en français. Si l'extrait ne contient aucun contenu pédagogique, renvoie une liste vide.`;
}
```

`analyzeChapterTopics` : `withPdfPart(pdf, part => retryWithBackoff(() => ai.models.generateContent({ model: GEMINI_MODEL, contents: [part, prompt], config: { temperature: 0.2, responseMimeType: "application/json", responseSchema } })))`, schéma construit dynamiquement (`levels` avec `enum` seulement si multi-niveau, `suggestedFormats.items.enum = SUGGESTED_FORMATS`). `JSON.parse(response.text).topics`.

`buildChapterPlanPrompt` : « Liste les chapitres du référentiel avec leurs pages de début et de fin (numéros de page du PDF, 1-based, pas la pagination imprimée). Entre 5 et 40 chapitres, sans recouvrement. »

**Step 4 :** PASS. Exporter depuis `src/lib/gemini.ts`.

### Task 7 : Service d'analyse (TDD)

**Files:**

- Create: `src/services/referenciel-analysis.service.ts`
- Test: `src/__tests__/referenciel-analysis.service.test.ts`

**Comportement de `runReferencielAnalysis(referencielId: number)` :**

1. Charger le référentiel ; `loadReferencielPdf`.
2. `readPdfOutline` → `outlineToChapters`. Si `[]` → `analyzeChapterPlan(pdf)` puis découpe des chapitres > 40 pages (réutiliser `outlineToChapters` n'est pas possible ici : ajouter un petit `splitLargeChapters(chapters, 40)` dans `chapters.ts` + test).
3. `update` : `analysisTotalChapters = chapters.length`, `analysisDoneChapters = 0`.
4. Pour chaque chapitre, **3 en parallèle max** : `extractPages` → `analyzeChapterTopics` → conversion en pages absolues (`abs = chapter.pageStart + rel - 1`, borné dans le chapitre) → `levels = referenciel.levels` si mono-niveau → upsert par `slug = slugify(chapter.title + " " + topic.title)` (en cas de doublon de slug dans le même chapitre, suffixer `-2`, `-3`) → `analysisDoneChapters: { increment: 1 }`.
   `order` global = `chapterIndex * 1000 + topicIndex`.
5. Si tous les chapitres ont réussi : `deleteMany` des sujets dont le slug n'a pas été vu, puis `analysisStatus = DONE`, `analyzedAt = now`.
6. Si un chapitre échoue (après `retryWithBackoff`) : on continue les autres, puis `analysisStatus = FAILED`, `analysisError = "N chapitre(s) en échec : ..."` et **on ne supprime rien** (les sujets déjà analysés restent utilisables).
7. Upsert : ne **pas** écraser `validated` ni les champs édités à la main si `validated === true` (seuls `pageStart`/`pageEnd`/`order` sont rafraîchis).

**Helper de concurrence** (local au service) :

```ts
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}
```

**Tests (mocks `@/lib/prisma`, `@/lib/gemini`, `@/lib/pdf/document`, `@/lib/referenciel-pdf`) :**

- sommaire exploitable → `analyzeChapterPlan` non appelé, `analyzeChapterTopics` appelé une fois par chapitre.
- sommaire vide → `analyzeChapterPlan` appelé.
- pages relatives converties en absolues (chapitre p.45, sujet rel 2-3 → 46-47).
- référentiel mono-niveau `["PSC"]` → `levels: ["PSC"]` forcé dans l'upsert.
- un chapitre rejeté → statut `FAILED`, `deleteMany` non appelé.
- tout OK → `deleteMany` avec `slug: { notIn: [...] }`, statut `DONE`.

### Task 8 : Server actions + exécution en arrière-plan

**Files:**

- Create: `src/app/actions/referenciel-topic-actions.ts`
- Test: `src/__tests__/referenciel-topic-actions.test.ts`
- Modify: `src/app/admin/referenciels/page.tsx` (ajouter `export const maxDuration = 800;`)

**Actions (toutes `SUPER_ADMIN`, schémas zod, retour `{ success, data?, error? }` comme le reste du projet) :**

```ts
export async function startReferencielAnalysisAction(referencielId: number);
// - refuse si PROCESSING et analysisStartedAt < 20 min ("Analyse déjà en cours")
// - update: PROCESSING, analysisStartedAt: now, analysisError: null, compteurs à 0
// - after(() => runReferencielAnalysis(id).catch(err => update FAILED + message))
// - revalidatePath("/admin/referenciels")

export async function getReferencielAnalysisAction(referencielId: number);
// -> statut (PROCESSING > 20 min renvoyé comme FAILED "Analyse interrompue"),
//    compteurs, et sujets triés par order avec
//    _count: { select: { questions: true, progressionNodes: true } }

export async function updateReferencielTopicAction(
  topicId: string,
  data: unknown
);
// édition title/summary/keyPoints/levels/questionCapacity → validated: true

export async function setTopicValidatedAction(
  topicId: string,
  validated: boolean
);
export async function deleteReferencielTopicAction(topicId: string);
```

`after` : `import { after } from "next/server";`. Dans les tests : `vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }))`.

> ⚠️ `maxDuration = 800` exige Fluid Compute sur un plan Pro ; sur Hobby le plafond est 300 s. Mesurer la durée réelle sur le PDF PSE (le plus gros) avant de mettre en prod. Si ça dépasse : passer `runReferencielAnalysis` en Vercel Workflow (une étape par chapitre), sans changer le reste du plan.

**Tests :** Forbidden, double lancement refusé, `after` appelle le service, statut périmé → FAILED, édition force `validated: true`.

### Task 9 : Niveaux du référentiel dans le formulaire

**Files:**

- Create: `src/lib/referenciel-levels.ts` → `export const REFERENCIEL_LEVELS = ["GQS", "PSC", "SST", "PSE1", "PSE2", "FORMATEUR"] as const;`
- Modify: `src/components/admin/referenciel-dialog.tsx` (cases à cocher, champ `levels` envoyé en `formData.getAll("levels")`)
- Modify: `src/app/actions/referenciel-actions.ts` (`create`/`update` lisent `levels`, filtrés sur `REFERENCIEL_LEVELS` ; type `Referenciel` enrichi de `levels` et `analysisStatus`)
- Modify: `src/__tests__/referenciel-actions.test.ts`

Option : après `createReferencielAction` réussi, lancer automatiquement l'analyse (`startReferencielAnalysisAction`). Recommandé : oui, avec une case « Analyser après import » cochée par défaut.

Checkpoint : `bun run test` + `bun run type-check`.

---

## Phase 3 — UI référentiel

### Task 10 : Colonne statut + action « Analyser »

**Files:**

- Modify: `src/components/admin/referenciels-table.tsx`

- Colonne « Analyse » : badge `NONE` (gris « Non analysé »), `PROCESSING` (« Analyse 3/12 » + spinner), `DONE` (« N sujets »), `FAILED` (rouge, tooltip `analysisError`).
- Menu Actions : « Analyser » / « Ré-analyser » → `startReferencielAnalysisAction` ; « Voir les sujets » → lien `/admin/referenciels/[id]/sujets`.
- Si au moins une ligne est `PROCESSING` : `router.refresh()` toutes les 5 s (`useEffect` + `setInterval`).

### Task 11 : Page des sujets avec couverture

**Files:**

- Create: `src/app/admin/referenciels/[id]/sujets/page.tsx` (server : `getReferencielAnalysisAction`)
- Create: `src/app/admin/referenciels/[id]/sujets/client-page.tsx`

Contenu :

- En-tête : titre, édition, niveaux, statut, bouton Ré-analyser.
- Filtres : niveau (si multi-niveau), « non couverts uniquement », « non validés ».
- Sujets groupés par `chapter` (accordéon shadcn). Par sujet : titre, pages `p.45-47`, badges niveaux, formats suggérés, barre de couverture `questions / questionCapacity`, nombre de leçons liées, icône validé.
- Actions par sujet : éditer (dialog : titre, résumé, points clés, niveaux, capacité), valider / dévalider, supprimer.
- Sélection multiple (cases) → barre d'actions : « Générer un quiz » (ouvre le dialog quiz pré-rempli, cf. Task 13) ; « Combler les trous » (présélectionne les sujets à couverture < 50 %).

Vérif manuelle : `bun run dev`, importer un petit référentiel (PSC), lancer l'analyse, voir la progression puis les sujets.

---

## Phase 4 — Quiz à partir des sujets

### Task 12 : Génération de quiz ciblée sur des sujets (TDD)

**Files:**

- Modify: `src/lib/gemini/quiz.ts`
- Modify: `src/app/actions/ai-quiz-actions.ts`
- Modify: `src/app/actions/quiz-actions.ts` (`importSchema` + `createManyAndReturn`)
- Tests: `src/__tests__/gemini.test.ts`, `src/__tests__/ai-quiz-actions.test.ts`

**Step 1 : `buildPrompt`** reçoit un paramètre optionnel `topics?: { id: string; title: string; summary: string; keyPoints: string[]; pageStart: number; pageEnd: number }[]`. Si présent, ajouter :

```
CONTEXTE CIBLÉ :
Le document fourni ne contient que les pages utiles du référentiel. Sujets à couvrir (répartis les questions équitablement, en proportion de leur richesse) :
- [id: <id>] <title> (pages <pageStart>-<pageEnd>) : <summary> Points clés : <keyPoints joints par " ; ">
Pour chaque question, renseigne "topicId" avec l'id du sujet concerné.
```

Le `responseSchema` ajoute `topicId: { type: Type.STRING, enum: topics.map(t => t.id) }` (requis) quand `topics` est fourni.

**Step 2 : action** — schéma :

```ts
const generateQuizSchema = z
  .object({
    referencielId: z.number(),
    topic: z.string().optional(),
    topicIds: z.array(z.string()).max(10).optional(),
    questionCount: z.number().min(1).max(30),
    level: z.string().optional(),
  })
  .refine((d) => d.topic?.trim() || d.topicIds?.length, {
    message: "Sujet ou sujets requis",
  });
```

Si `topicIds` :

- charger les sujets `where: { id: { in: topicIds }, referencielId }` (rejeter si nombre différent) ;
- `pdf = await extractPages(fullPdf, mergePageRanges(topics))` ;
- `topic` (texte) = titres joints par « , » si non fourni ;
- anti-doublon : questions existantes filtrées `where: { topicId: { in: topicIds } }` (plus pertinent et plus court) ;
- après validation, `topicId` hors liste → `undefined`.

`generatedQuizSchema.questions[]` : ajouter `topicId: z.string().optional()`.

**Step 3 : `importQuizAction`** : `topicId: z.string().optional().nullable()` dans `importSchema.questions[]`, et `topicId: q.topicId ?? null` dans `createManyAndReturn`.

**Tests :**

- avec `topicIds` → `extractPages` appelé avec les plages fusionnées, `generateQuizFromPdf` reçoit `topics` ;
- `topicIds` d'un autre référentiel → erreur ;
- `topicId` inconnu renvoyé par l'IA → retiré ;
- import persiste `topicId`.

### Task 13 : Dialog de génération de quiz

**Files:**

- Modify: `src/components/admin/quiz/ai-generate-dialog.tsx`

- Après choix du référentiel : si `analysisStatus === DONE`, afficher un sélecteur multi-sujets (combobox avec recherche, groupé par chapitre, couverture affichée) **à la place** du champ texte ; lien « saisir un sujet libre » pour revenir à l'ancien mode.
- Pré-remplir `questionCount` = `min(30, somme des capacités restantes)`.
- Props optionnelles `initialReferencielId` / `initialTopicIds` pour l'ouverture depuis la page des sujets (Task 11).
- `aiPrompt` envoyé à l'import = titres des sujets.

Vérif manuelle : générer un quiz sur 2 sujets → importer → la couverture des 2 sujets augmente sur la page des sujets.

---

## Phase 5 — Parcours Duolingo à partir des sujets

### Task 14 : Planification des nœuds (TDD, fonction pure)

**Files:**

- Create: `src/lib/progression/plan-from-topics.ts`
- Test: `src/__tests__/plan-from-topics.test.ts`

```ts
export type PlannableTopic = {
  id: string;
  chapter: string;
  title: string;
  order: number;
  levels: string[];
  questionCapacity: number;
};

/**
 * Filtre par niveau, trie par order, regroupe des sujets consécutifs du même
 * chapitre en nœuds de 1 à 3 sujets. Un sujet riche (capacity >= 12) reste seul.
 */
export function planNodesFromTopics(
  topics: PlannableTopic[],
  level: string
): { title: string; topicIds: string[] }[];
```

Titre du nœud : titre du sujet si seul, sinon `chapter` (suffixé ` (2)`, ` (3)`… si le chapitre produit plusieurs nœuds).

**Tests :** filtrage niveau (PSE1 vs PSE2), jamais plus de 3 sujets, pas de mélange de chapitres, sujet riche isolé, ordre conservé.

### Task 15 : Génération du parcours en arrière-plan

> **Décision (2026-10-02) : génération pilotée par la page, pas `after()`.** Mesure sur le PSE réel : `planNodesFromTopics` donne 71 nœuds PSE1 / 41 PSE2 ; à ~40 s par appel Gemini, ~47 min pour PSE1, très au-delà de `maxDuration` (800 s). La page admin appelle en boucle une action « générer le nœud suivant » (un nœud par appel), la progression `generationDone/generationTotal` est persistée et la génération peut reprendre là où elle s'est arrêtée. Pas de Vercel Workflow pour l'instant. Les étapes ci-dessous sont à adapter en conséquence.

**Files:**

- Modify: `prisma/schema/progression.prisma` : `ProgressionTree` + `generationStatus AnalysisStatus @default(NONE)`, `generationDone Int @default(0)`, `generationTotal Int @default(0)`, `generationError String?` → migration `progression_tree_generation_status`.
- Modify: `src/lib/gemini/progression.ts` : `generateProgressionNodeFromPdf` accepte `topics?` (même bloc « CONTEXTE CIBLÉ » que Task 12, sans `topicId`).
- Modify: `src/services/progression.service.ts` : nouvelle méthode `generateTreeFromTopics({ treeId, referencielId })`.
- Modify: `src/app/actions/progression-admin-actions.ts` : `generateTreeFromTopicsAction` (`after()`, même garde « déjà en cours » que Task 8).
- Modify: `src/app/admin/progression/page.tsx` : `export const maxDuration = 800;`
- Tests: `src/__tests__/progression-actions.test.ts`

`generateTreeFromTopics` :

1. `tree.referencielId = referencielId` ; sujets du référentiel → `planNodesFromTopics(topics, tree.level)`.
2. `deleteMany` des nœuds existants de l'arbre (comme aujourd'hui), `generationTotal = plan.length`.
3. Pour chaque nœud planifié, **séquentiellement** (ordre = index) : `extractPages(fullPdf, mergePageRanges(sujets))` → `generateProgressionNodeFromPdf({ pdf, topic: titre, topics, level, structureConfig: { microCourseCount: 1, quizCount: 3, flashcardCount: 1 } })` → créer le nœud avec `topics: { connect: topicIds.map(id => ({ id })) }` et ses exercices. Pour la persistance des exercices, **extraire** la boucle de `generateEntireTreeWithAi` (création question / flashcard / exercice) dans une fonction privée `persistAiExercises(tx, nodeId, exercises, { quizId, level, fallbackTheme, topicId })` réutilisée par les deux chemins. Les questions créées reçoivent `topicId` = premier sujet du nœud.
4. `generationDone += 1` après chaque nœud ; nœud en échec → on continue, on note l'erreur ; fin → `DONE` ou `FAILED`.

> Remarque repérée en lisant le code : `generateEntireTreeWithAi` enregistre `correctAnswer: String(ex.correctAnswer)` ("0"–"3") alors que l'import de quiz utilise des lettres ("A"–"D"). À aligner dans `persistAiExercises` (vérifier ce que lit `play-session.tsx` avant de choisir).

### Task 16 : UI parcours

**Files:**

- Modify: `src/app/admin/progression/components/ProgressionAiGenerator.tsx`

- Mode « Parcours complet depuis les sujets » : choix du référentiel (filtré sur ceux dont `levels` contient `tree.level` et analysés), **aperçu du plan** (`planNodesFromTopics` côté client sur les sujets chargés, liste des nœuds avec leurs sujets), bouton Générer → `generateTreeFromTopicsAction`, puis barre de progression `generationDone / generationTotal` (refresh toutes les 5 s).
- Mode « Leçon unique » : remplacer le champ texte par le sélecteur de sujets (même composant que Task 13, à extraire dans `src/components/admin/topic-picker.tsx`).
- Garder l'ancien mode texte libre en repli quand le référentiel n'est pas analysé.

---

## Vérification finale

1. `bun run test` → tout vert.
2. `bun run type-check` et `bun run lint` → verts.
3. Manuel, local (`bun run dev`) :
   - importer le référentiel PSC → analyse auto → sujets visibles, niveaux = PSC partout ;
   - importer le référentiel PSE → sujets avec niveaux PSE1 / PSE2 distincts ;
   - éditer un sujet → passe « validé » ; ré-analyser → l'édition est conservée, la couverture aussi ;
   - générer un quiz sur 2 sujets → explications citant des pages cohérentes, couverture mise à jour ;
   - générer le parcours PSE1 → nœuds de 1 à 3 sujets, ordre du référentiel, jouable côté `/player`.
4. Mesurer la durée d'analyse du PSE (logs) et la comparer à `maxDuration`.

## Hors scope (plus tard)

- Prérequis entre sujets et graphe de dépendances.
- Liaison `LearningCard.topicId` (flashcards hors parcours).
- Diff entre deux éditions d'un référentiel (signaler les questions obsolètes).
- Cache de contexte Gemini pour les générations en lot.
