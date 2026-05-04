-- RLS policies for news, events, transparency_items
-- Requires a recursion-safe helper function `public.is_admin()` (SECURITY DEFINER) already created.
-- If you don't have it yet, create it first (we used it earlier to avoid infinite recursion on profiles).

-- NEWS -----------------------------------------------------------------
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published news" ON public.news;
CREATE POLICY "Public can read published news"
ON public.news
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Admins manage news" ON public.news;
CREATE POLICY "Admins manage news"
ON public.news
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- EVENTS ----------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read events" ON public.events;
CREATE POLICY "Public can read events"
ON public.events
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events"
ON public.events
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- TRANSPARENCY ITEMS ----------------------------------------------------
ALTER TABLE public.transparency_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published transparency items" ON public.transparency_items;
CREATE POLICY "Public can read published transparency items"
ON public.transparency_items
FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Admins manage transparency items" ON public.transparency_items;
CREATE POLICY "Admins manage transparency items"
ON public.transparency_items
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

