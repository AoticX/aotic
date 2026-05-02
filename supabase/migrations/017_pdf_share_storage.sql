-- Public Supabase Storage bucket for temporary PDF sharing (WhatsApp attachments)
-- Files are swept by pg_cron after 2 hours so Wasender can always fetch them
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdf-share', 'pdf-share', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Public read so Wasender can download without auth
CREATE POLICY IF NOT EXISTS "pdf-share public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdf-share');

CREATE POLICY IF NOT EXISTS "pdf-share authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdf-share');

CREATE POLICY IF NOT EXISTS "pdf-share authenticated delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdf-share');

-- Hourly cleanup: delete files older than 2 hours
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-pdf-share',
  '0 * * * *',
  $$
    DELETE FROM storage.objects
    WHERE bucket_id = 'pdf-share'
      AND created_at < NOW() - INTERVAL '2 hours';
  $$
);
