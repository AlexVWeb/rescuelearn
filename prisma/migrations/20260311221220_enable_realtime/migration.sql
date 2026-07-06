-- ==========================================
-- SUPABASE REALTIME CONFIGURATION
-- ==========================================

-- Create publication for realtime if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- Add the Emargement table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE "Emargement";

-- Set Replica Identity to FULL to broadcast old and new values
ALTER TABLE "Emargement" REPLICA IDENTITY FULL;

-- Enable RLS on the Emargement table
-- Required for Supabase Realtime to broadcast changes to anon/authenticated connections
ALTER TABLE "Emargement" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy to allow Supabase Realtime to broadcast the changes publicly
-- Note: This is safe because it only enables the listening channel, data modification is still secured by Prisma.
CREATE POLICY "Activer Realtime public sur Emargement" 
  ON "Emargement" FOR SELECT 
  USING (true);

-- Grant privileges to the anon and authenticated roles so they can access the table
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON "Emargement" TO anon, authenticated;
