-- Ensure documents table has proper RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_authenticated" ON public.documents;

CREATE POLICY "documents_select"
ON public.documents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "documents_insert"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "documents_update"
ON public.documents FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "documents_delete"
ON public.documents FOR DELETE TO authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;