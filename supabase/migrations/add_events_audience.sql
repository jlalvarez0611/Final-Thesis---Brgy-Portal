-- Who the event is for: community residents vs barangay officials
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'residents';

UPDATE public.events SET audience = 'residents' WHERE audience IS NULL;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_audience_check;
ALTER TABLE public.events ADD CONSTRAINT events_audience_check
  CHECK (audience IN ('residents', 'officials'));

COMMENT ON COLUMN public.events.audience IS 'residents = community / non-official; officials = barangay officials';
