-- Shared couple / friends photo for the Home polaroid
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS couple_photo_url TEXT;
