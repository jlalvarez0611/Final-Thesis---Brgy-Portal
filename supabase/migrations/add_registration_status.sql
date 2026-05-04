-- Distinguish pending vs rejected registration (both had is_approved = false before).
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS registration_status text DEFAULT 'pending';

UPDATE public.profiles
SET registration_status = CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
WHERE registration_status IS NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_registration_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_registration_status_check
  CHECK (registration_status IN ('pending', 'approved', 'rejected'));
