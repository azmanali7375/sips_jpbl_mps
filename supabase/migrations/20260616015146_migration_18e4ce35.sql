-- STEP 5: Enable RLS on all other tables with authenticated access

-- applications table
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_authenticated" ON public.applications
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_authenticated" ON public.reviews
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_authenticated" ON public.documents
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_authenticated" ON public.notifications
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- osc_decisions table
ALTER TABLE public.osc_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "osc_decisions_authenticated" ON public.osc_decisions
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- generated_reports table
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated_reports_authenticated" ON public.generated_reports
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- report_templates table
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_templates_authenticated" ON public.report_templates
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- compliance_rules table
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compliance_rules_authenticated" ON public.compliance_rules
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- approved_plans table
ALTER TABLE public.approved_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved_plans_authenticated" ON public.approved_plans
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- workflow_history table
ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_history_authenticated" ON public.workflow_history
FOR ALL TO authenticated USING (true) WITH CHECK (true);