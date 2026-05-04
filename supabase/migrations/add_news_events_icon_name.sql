-- Optional icon for news/events (Lucide React component name, e.g. Newspaper, Calendar).
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS icon_name text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS icon_name text;
