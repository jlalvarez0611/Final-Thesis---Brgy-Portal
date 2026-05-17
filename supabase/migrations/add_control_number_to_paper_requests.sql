-- Add a control number to paper requests for document tracking
ALTER TABLE IF EXISTS paper_requests
  ADD COLUMN IF NOT EXISTS control_number text;

-- Optional index for quick lookup by control number
CREATE INDEX IF NOT EXISTS idx_paper_requests_control_number ON paper_requests (control_number);
