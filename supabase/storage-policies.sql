-- Storage policies live on `storage.objects`.
-- These policies allow anonymous upload/download of encrypted blobs in the
-- `love-letters` bucket.

-- Read (download)
DROP POLICY IF EXISTS "Public read encrypted letters" ON storage.objects;
CREATE POLICY "Public read encrypted letters" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'love-letters');

-- Upload (create)
DROP POLICY IF EXISTS "Public upload encrypted letters" ON storage.objects;
CREATE POLICY "Public upload encrypted letters" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'love-letters');

-- Delete (best-effort cleanup on failed creates)
DROP POLICY IF EXISTS "Public delete encrypted letters" ON storage.objects;
CREATE POLICY "Public delete encrypted letters" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'love-letters');
