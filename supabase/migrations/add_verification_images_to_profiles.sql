-- Add verification image storage paths to profiles
-- Run this in your Supabase SQL Editor (or via migrations)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id_image_path TEXT,
ADD COLUMN IF NOT EXISTS selfie_image_path TEXT;

