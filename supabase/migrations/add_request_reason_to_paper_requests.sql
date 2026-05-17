-- Add request reason column to paper_requests table
ALTER TABLE IF EXISTS public.paper_requests
ADD COLUMN IF NOT EXISTS request_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_paper_requests_request_reason'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_paper_requests_request_reason ON public.paper_requests(request_reason);
  END IF;
END
$$;
