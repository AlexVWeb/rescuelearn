-- Defense en profondeur : retire les privileges de table au role `anon`.
--
-- La RLS (migrations precedentes) bloque deja anon (deny-all). Ce REVOKE
-- ajoute une 2e couche : anon n'a carrement plus le privilege SELECT/INSERT/
-- UPDATE/DELETE sur les tables public. Meme une future policy trop permissive
-- ajoutee par erreur pour anon resterait sans effet, faute de privilege.
--
-- Cible UNIQUEMENT `anon`. On ne touche pas a `authenticated` : il garde ses
-- privileges, necessaires au Realtime Authorization de "Emargement"
-- (JWT role=authenticated frappe par /api/realtime/token).
--
-- Non impacte :
--   * Prisma (role proprietaire `postgres`) : privileges intacts.
--   * Quiz public (presence/broadcast) : ne touche aucune table -> OK.

-- Tables existantes
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;

-- Sequences (par coherence : pas d'ecriture via anon)
REVOKE USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Tables/sequences CREEES PLUS TARD : empeche le GRANT automatique a anon.
-- `postgres` est le role qui cree les objets (migrations Prisma).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT, UPDATE
  ON SEQUENCES FROM anon;
