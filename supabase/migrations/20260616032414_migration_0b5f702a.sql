-- Ensure all other SIPS tables have RLS enabled
-- This is a safety check to enable any missed tables

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'applications', 'reviews', 'documents', 'notifications',
    'osc_decisions', 'generated_reports', 'report_templates',
    'compliance_rules', 'approved_plans', 'workflow_history',
    'written_directives', 'site_visits', 'site_photos',
    'caj_pemajuan', 'laporan_teknikal', 'ulasan_perancangan',
    'agency_ulasan', 'kertas_perakuan', 'planning_documents',
    'policy_chunks', 'public_holidays', 'audit_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      -- Enable RLS if not already enabled
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      
      -- Drop existing policy if any
      EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated" ON public.%I', tbl, tbl);
      
      -- Create policy allowing all operations for authenticated users
      EXECUTE format(
        'CREATE POLICY "%s_authenticated" ON public.%I
         FOR ALL TO authenticated
         USING (true) WITH CHECK (true)',
        tbl, tbl
      );
      
      -- Grant privileges
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
      
      RAISE NOTICE '✓ RLS enabled for table: %', tbl;
    EXCEPTION 
      WHEN undefined_table THEN
        RAISE NOTICE '⊘ Table % does not exist, skipped', tbl;
      WHEN OTHERS THEN
        RAISE NOTICE '✗ Error on table %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;