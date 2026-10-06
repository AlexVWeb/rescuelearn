-- Realtime Authorization pour public."Emargement"
--
-- La migration precedente a active la RLS sur toutes les tables public
-- (deny-all pour anon/authenticated sans policy). On ouvre ici UNIQUEMENT
-- la lecture de "Emargement" au role `authenticated`.
--
-- Effet :
--   * Supabase Realtime applique cette policy quand un client abonne
--     `postgres_changes` sur "Emargement" avec un JWT role=authenticated
--     (frappe par /api/realtime/token pour un admin connecte). -> changes delivres.
--   * Role `anon` (cle publique du bundle front) : AUCUNE policy -> deny-all.
--     L'API REST/Realtime reste fermee aux anonymes. "Emargement" (dont
--     validationCode) n'est PAS re-expose publiquement.
--   * Role `postgres` (Prisma) : proprietaire -> bypass RLS, non impacte.
--
-- La table doit faire partie de la publication Realtime pour que
-- postgres_changes fonctionne (cf. note dans le PR / dashboard Supabase).

ALTER TABLE public."Emargement" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realtime_authenticated_read_emargement" ON public."Emargement";

CREATE POLICY "realtime_authenticated_read_emargement"
  ON public."Emargement"
  FOR SELECT
  TO authenticated
  USING (true);

-- S'assure que la table est publiee pour Realtime (idempotent / tolere l'absence).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public."Emargement";
    EXCEPTION
      WHEN duplicate_object THEN NULL; -- deja dans la publication
    END;
  END IF;
END $$;
