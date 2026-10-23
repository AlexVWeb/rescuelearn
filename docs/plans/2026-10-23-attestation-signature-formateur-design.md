# Signature des attestations de fin de formation par le formateur

## Objectif

Permettre au formateur de **signer** les attestations de fin de formation d'une session,
pour que le stagiaire télécharge depuis son espace **la version signée, figée et stockée**.

Aujourd'hui : simple libellé « Signature du Formateur » sans signature
(`pdf-attestation-fin-formation-psc-export.tsx:377-380`), PDF recalculé à chaque
téléchargement et jamais stocké (`espace/sessions/[inscriptionId]/attestation/route.ts:14`).

Niveau visé : **signature électronique simple (SES)** au sens eIDAS (art. 3(10)), rendue
probante par un document figé, une empreinte SHA-256 et des métadonnées de signature.
Pas d'AES / PAdES cryptographique à ce stade.

## Décisions

- **Tracé à chaque session** : le formateur dessine sa signature au moment de publier.
  Pas de signature enregistrée réutilisable.
- **Signataire = celui qui publie**, obligatoirement formateur affecté à la session
  (`TrainingSessionFormateur`). « Je soussigné(e) » affiche son seul nom.
  Un admin non affecté ne peut pas signer.
- **PDF figé** : rendu une seule fois à la signature, stocké chiffré sur R2 avec son SHA-256.
  Le stagiaire télécharge exactement ce fichier.
- **Correction = dépublier puis re-signer.** Tant qu'une signature est active, les données
  qui alimentent l'attestation sont verrouillées.
- **PDF conservés après anonymisation** (preuve), supprimés à la purge.
- **Signer = publier** : « Publier » devient « Signer et publier ».

## Parcours

Onglet clôture (`sessions/[id]/components/close/attestations-publication.tsx`) :

1. Bouton **« Signer et publier »** → dialogue :
   - résumé « Vous signez N attestations en tant que **NOM Prénom** » ;
   - zone de tracé + « Effacer » ;
   - case « Prévenir les stagiaires par email » (existante).
2. Bouton désactivé, avec explication, si :
   - l'utilisateur n'est pas formateur affecté à la session ;
   - des stagiaires n'ont pas de résultat.
3. Validation → rendu, stockage, publication, emails.
4. **« Dépublier »** révoque la signature et débloque les modifications.

Avant signature, l'aperçu non signé actuel reste disponible
(`close/documents-section.tsx:141`, `:245`), libellé « Aperçu non signé ».

## Données

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

Migration SQL : index unique partiel, **une seule signature active par session** :

```sql
CREATE UNIQUE INDEX "AttestationSignature_active_session_key"
  ON "AttestationSignature" ("trainingSessionId")
  WHERE "revokedAt" IS NULL;
```

- `TrainingSession.attestationsPublishedAt` conservé : écrit dans la même transaction que
  la signature. Publié ⇔ signature active (hors sessions publiées avant la fonctionnalité).
- Politiques RLS / privilèges : alignées sur les autres tables training
  (cf. `20261006190000_revoke_anon_table_privileges`).

## Flux serveur

### `signAndPublishAttestations(sessionId, { signaturePng, notify })`

`src/app/admin/training/actions/attestations.ts`

1. **Contrôles** : `requireOrganisme`, session de l'organisme, utilisateur dans
   `TrainingSessionFormateur`, aucune signature active, tous les résultats saisis.
2. **PNG** : data URL décodée côté serveur, en-tête PNG vérifié, ≤ 200 Ko.
3. **Rendu** : pour chaque inscription « acquis » (`getAttestationState` = `available`),
   `renderAttestationPDF` avec un `signer` au lieu de `formateur` :
   - « Je soussigné(e) » = `signerName` ;
   - « Le » = `signedAt` ;
   - image du tracé sous « Signature du Formateur » ;
   - pied de page : _« Signé électroniquement par NOM Prénom le JJ/MM/AAAA à HHhMM — réf. &lt;signatureId&gt; »_.
4. **Stockage** : `uploadFile(key, buffer, "application/pdf", true)` (`r2.ts:25`),
   clé `getStorageKey(organismeId, "attestations", "<sessionId>/<signatureId>/<inscriptionId>.pdf")`,
   5 envois en parallèle maximum. SHA-256 calculé sur le buffer en clair.
   Image du tracé stockée de la même façon.
5. **Transaction** : `AttestationSignature` + `SignedAttestation[]` + `attestationsPublishedAt`.
   Échec → suppression au mieux des fichiers déjà envoyés.
6. **Emails** : `deliverAccessToAll(available, session, "attestation")` après commit.

`signatureId` généré avant le rendu (cuid côté serveur) : il apparaît dans le PDF et dans la clé R2.

### `unpublishAttestations(sessionId)`

- `attestationsPublishedAt = null` ;
- signature active : `revokedAt`, `revokedById` ;
- suppression des PDF et du PNG sur R2 (les lignes et empreintes restent).

### Verrou tant qu'une signature est active

Erreur « Attestations signées : dépubliez-les pour modifier. » sur :

- `updateAttestationResult` / `updateAttestationResults` (`inscriptions.ts:90-148`) ;
- ajout / retrait d'inscrits à la session ;
- `setSessionFormateurs`.

### Téléchargement

- **Stagiaire** : `espace/sessions/[inscriptionId]/attestation/route.ts` sert le
  `SignedAttestation` de la signature active (`getFile(key, true)`). Sans signature
  (session publiée avant la fonctionnalité) : rendu à la volée actuel, inchangé.
- **Admin** : route serveur pour un PDF signé ; « Toutes les attestations » fusionne les
  PDF signés avec `pdf-lib` (copie de travail, la référence reste le fichier individuel).

### Rétention

- `anonymizeInactiveTrainees` : PDF conservés.
- `purgeExpiredTrainees` : supprime aussi les fichiers R2 des `SignedAttestation` du
  stagiaire avant `trainee.delete` (sinon la cascade laisse des fichiers orphelins).

## Client

Composant `SignaturePad` (canvas, bibliothèque `signature_pad`, version figée) :

- « Effacer », refus d'un tracé vide ;
- export **uniquement** `toDataURL("image/png")`. Jamais `toData()` (points, temps) :
  image statique, hors du champ biométrique (RGPD art. 4(14)).

## Erreurs

| Situation                                         | Comportement                                                    |
| ------------------------------------------------- | --------------------------------------------------------------- |
| Utilisateur non affecté                           | « Seul un formateur de la session peut signer. » (serveur + UI) |
| Résultats manquants                               | « N stagiaires sans résultat. » — aucun rendu                   |
| Signature déjà active (double clic, deux onglets) | Index unique partiel → « Attestations déjà signées »            |
| PNG invalide / vide / trop lourd                  | Rejet avant rendu                                               |
| Échec R2 ou rendu en cours de lot                 | Fichiers supprimés, rien en base, session non publiée           |
| Fichier absent de R2 au téléchargement            | 404 identique à l'actuel + `logger.error`                       |
| Échec emails                                      | Publication conservée, compteur `failed` dans le toast          |

Limites Vercel : ~20 rendus de 30–50 Ko par session, très en deçà de 300 s ;
requête limitée au PNG (bien sous 4,5 Mo).

## Tests (Vitest, Prisma et R2 mockés, style `inscriptions.test.ts`)

- `attestations.test.ts` :
  - refus utilisateur non affecté / résultats manquants / signature déjà active ;
  - rendu limité aux « acquis » ;
  - `sha256` stocké = SHA-256 du buffer envoyé ;
  - échec de transaction → fichiers supprimés ;
  - dépublication → `revokedAt` renseigné, fichiers supprimés.
- `inscriptions.test.ts` : résultats verrouillés si signature active.
- `retention-service.test.ts` : la purge supprime les fichiers d'attestation.
- Validation PNG : signature binaire, taille, base64 invalide.
- Rendu : `renderAttestationPDF` avec `signer` → PDF valide contenant le nom du
  signataire (extraction texte via `unpdf`).

## Hors périmètre

- Signature enregistrée réutilisable.
- Cosignature par plusieurs formateurs.
- Signature PAdES cryptographique, AES / cachet via prestataire.
- PIN individuel d'émargement (chantier séparé, issu de l'audit eIDAS).
