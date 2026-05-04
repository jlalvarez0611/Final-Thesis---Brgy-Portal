-- Public bucket for transparency PDF reports (residents view via public URL; admins upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('transparency', 'transparency', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read published files from this bucket (bucket is public; objects follow bucket policy)
DROP POLICY IF EXISTS "Public read transparency PDFs" ON storage.objects;
CREATE POLICY "Public read transparency PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'transparency');

DROP POLICY IF EXISTS "Admins upload transparency PDFs" ON storage.objects;
CREATE POLICY "Admins upload transparency PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'transparency' AND public.is_admin());

DROP POLICY IF EXISTS "Admins update transparency PDFs" ON storage.objects;
CREATE POLICY "Admins update transparency PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'transparency' AND public.is_admin())
WITH CHECK (bucket_id = 'transparency' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete transparency PDFs" ON storage.objects;
CREATE POLICY "Admins delete transparency PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'transparency' AND public.is_admin());
