-- ══════════════════════════════════════════════
-- TABLE: applications (not permohonan - using correct table name)
-- Core table for all applications
-- ══════════════════════════════════════════════

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_select" ON public.applications;
CREATE POLICY "applications_select"
ON public.applications FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "applications_insert" ON public.applications;
CREATE POLICY "applications_insert"
ON public.applications FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "applications_update" ON public.applications;
CREATE POLICY "applications_update"
ON public.applications FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS "applications_delete" ON public.applications;
CREATE POLICY "applications_delete"
ON public.applications FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'ketua_unit')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
REVOKE ALL ON public.applications FROM anon;