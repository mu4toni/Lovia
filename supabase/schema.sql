-- ============================================================
-- Lovia Supabase Database Schema (Postgres + Realtime + Storage)
-- ============================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. Tables
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  avatar_url TEXT,
  couple_id TEXT,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  timezone_offset INTEGER NOT NULL DEFAULT 0,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Migrations for existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone_offset INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS delete_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS delete_code_expires_at TIMESTAMPTZ;

-- Couples table
CREATE TABLE IF NOT EXISTS public.couples (
  id TEXT PRIMARY KEY,
  invite_code TEXT UNIQUE NOT NULL,
  code_expires_at TIMESTAMPTZ NOT NULL,
  code_status TEXT NOT NULL DEFAULT 'active' CHECK (code_status IN ('active', 'used', 'expired')),
  space_type TEXT NOT NULL DEFAULT 'relationship',
  user1_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting_partner' CHECK (status IN ('waiting_partner', 'connected', 'dissolved')),
  start_date DATE,
  couple_photo_url TEXT,
  streak_count INTEGER NOT NULL DEFAULT 0,
  streak_last_date DATE,
  streak_ping_date DATE,
  streak_ping_users TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  dissolved_at TIMESTAMPTZ
);

-- Migration for existing couples table
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS space_type TEXT NOT NULL DEFAULT 'relationship';
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS couple_photo_url TEXT;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS streak_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS streak_last_date DATE;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS streak_ping_date DATE;
ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS streak_ping_users TEXT[] NOT NULL DEFAULT '{}';

-- Foreign key back from users to couples
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_users_couple'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT fk_users_couple 
    FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#F4DDE2',
  icon TEXT NOT NULL DEFAULT 'heart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Reminders (tasks / care requests) table
CREATE TABLE IF NOT EXISTS public.reminders (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  for_user_id TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  due_date DATE,
  due_time TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id TEXT,
  date DATE NOT NULL,
  time TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Wishlist items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  price NUMERIC(10, 2),
  category_id TEXT DEFAULT 'gifts',
  is_booked BOOLEAN NOT NULL DEFAULT false,
  booked_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Memorable dates table (Relationship chronicle)
CREATE TABLE IF NOT EXISTS public.memorable_dates (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  is_annual BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Date memories (Photo album and date diary) table
CREATE TABLE IF NOT EXISTS public.date_memories (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  place TEXT,
  location_data JSONB,
  story TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Notification logs table (Tracks sent telegram notifications to avoid duplicates)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  couple_id TEXT REFERENCES public.couples(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  payload JSONB
);

-- ============================================================
-- 3. Indexes for maximum query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_couple_id ON public.users(couple_id);
CREATE INDEX IF NOT EXISTS idx_couples_invite_code ON public.couples(invite_code);
CREATE INDEX IF NOT EXISTS idx_reminders_couple_id ON public.reminders(couple_id);
CREATE INDEX IF NOT EXISTS idx_events_couple_id ON public.events(couple_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_couple_id ON public.wishlist_items(couple_id);
CREATE INDEX IF NOT EXISTS idx_memorable_dates_couple ON public.memorable_dates(couple_id);
CREATE INDEX IF NOT EXISTS idx_date_memories_couple ON public.date_memories(couple_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs(notification_type);

-- ============================================================
-- 4. Enable Supabase Realtime publication
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.memorable_dates;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.date_memories;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
EXCEPTION WHEN OTHERS THEN
  -- Table already in publication, ignore
  NULL;
END $$;

-- ============================================================
-- 5. Row Level Security (RLS) - Permissive for authenticated pairs
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorable_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated access with API key (Lovia client-side model)
DO $$
BEGIN
  CREATE POLICY "Public access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to couples" ON public.couples FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to reminders" ON public.reminders FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to events" ON public.events FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to wishlist" ON public.wishlist_items FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to memorable_dates" ON public.memorable_dates FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to date_memories" ON public.date_memories FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to notification_logs" ON public.notification_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================
-- 6. Storage bucket for photos and avatars
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lovia_media', 'lovia_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public access to media bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'lovia_media')
WITH CHECK (bucket_id = 'lovia_media');

-- ============================================================
-- 7. Support & Ad Bot Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_bot_users (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.support_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.support_bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Public access to support_bot_users" ON public.support_bot_users FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public access to support_settings" ON public.support_settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

