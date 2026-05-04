-- Add image support for officials
ALTER TABLE public.officials
ADD COLUMN IF NOT EXISTS image_url TEXT;

