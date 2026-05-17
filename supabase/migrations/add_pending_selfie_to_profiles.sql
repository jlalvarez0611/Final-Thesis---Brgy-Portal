-- Add pending selfie fields to profiles so admins can approve photo changes
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS pending_selfie_path text;

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS pending_selfie_status text;

-- Optional index to quickly find pending selfie approvals
CREATE INDEX IF NOT EXISTS idx_profiles_pending_selfie_status ON profiles (pending_selfie_status);
