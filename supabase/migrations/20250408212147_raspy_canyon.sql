-- Create storage bucket for student images
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-images', 'student-images', true);

-- Add storage policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-images' AND
  auth.role() = 'authenticated'
);

-- Add storage policy to allow public access to images
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'student-images');