-- ══════════════════════════════════════════════
-- ALL OTHER SIPS TABLES
-- Apply RLS + open authenticated access
-- ══════════════════════════════════════════════

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'reviews', 'documents', 'notifications',
    'osc_decisions', 'generated_reports',
    'report_templates', 'compliance_rules',
    'approved_plans', 'workflow_history',
    'written_directives', 'site_visits',
    'site_photos', 'caj_pemajuan',
    'laporan_teknikal', 'ulasan_perancangan',
    'agency_ulasan', 'kertas_perakuan',
    'planning_documents', 'policy_chunks',
    'public_holidays', 'audit_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl
      );
      EXECUTE format(
        'DROP POLICY IF EXISTS "%s_authenticated" ON public.%I',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "%s_authenticated" ON public.%I
         FOR ALL TO authenticated
         USING (true) WITH CHECK (true)',
        tbl, tbl
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE
         ON public.%I TO authenticated',
        tbl
      );
      EXECUTE format(
        'REVOKE ALL ON public.%I FROM anon', tbl
      );
      RAISE NOTICE 'RLS enabled for table: %', tbl;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist yet, skipping', tbl;
    END;
  END LOOP;
END $$;