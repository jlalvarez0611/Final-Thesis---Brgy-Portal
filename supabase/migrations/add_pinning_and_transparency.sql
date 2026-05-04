-- Add pinning for news (announcements)
ALTER TABLE public.news
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_news_pinned ON public.news(pinned, pinned_at);

-- Add pinning for events (upcoming schedules)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_pinned ON public.events(pinned, pinned_at);

-- Transparency dashboard: simple public items with optional file URL
CREATE TABLE IF NOT EXISTS public.transparency_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  file_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  pinned BOOLEAN NOT NULL DEFAULT false,
  pinned_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transparency_published ON public.transparency_items(published);
CREATE INDEX IF NOT EXISTS idx_transparency_pinned ON public.transparency_items(pinned, pinned_at);

