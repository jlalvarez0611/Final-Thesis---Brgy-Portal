-- RLS policies for officials
-- Requires recursion-safe helper function `public.is_admin()` already created.

ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;

-- Residents/public can view officials
DROP POLICY IF EXISTS "Officials are viewable" ON public.officials;
CREATE POLICY "Officials are viewable"
ON public.officials
FOR SELECT
USING (true);

-- Admins can manage officials
DROP POLICY IF EXISTS "Admins manage officials" ON public.officials;
CREATE POLICY "Admins manage officials"
ON public.officials
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

