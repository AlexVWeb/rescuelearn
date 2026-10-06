-- Enable Row Level Security (RLS) on every table of the `public` schema.
--
-- Contexte : la clé `anon` Supabase est publique (bundle front NEXT_PUBLIC_*)
-- et PostgREST expose toutes les tables `public`. Sans RLS, n'importe qui
-- peut lire/écrire la base via l'API REST (User.password, Session.token, etc.).
--
-- Effet :
--   * roles `anon` / `authenticated` (PostgREST)  -> soumis a la RLS.
--     Aucune policy n'etant definie, l'acces est refuse par defaut (deny-all).
--   * role `postgres` (proprietaire des tables, utilise par Prisma via
--     DATABASE_URL / DIRECT_URL) -> BYPASS la RLS car proprietaire.
--
-- IMPORTANT : on utilise uniquement ENABLE (pas FORCE). FORCE soumettrait
-- aussi le proprietaire a la RLS et casserait Prisma en production.
--
-- Idempotent : ENABLE sur une table deja protegee est sans effet.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'          -- tables ordinaires uniquement
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
