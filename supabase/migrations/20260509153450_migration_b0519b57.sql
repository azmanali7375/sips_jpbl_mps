-- Update profiles role constraint to include Malaysian government roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('applicant', 'admin_assistant', 'unit_head', 'assistant_planner_j5', 'department_head', 'ydp', 'officer', 'admin'));

-- Update applications status to match Malaysian SPC workflow stages
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check 
CHECK (status IN (
  'osc_received',        -- Received from OSC
  'registered',          -- Registered by Admin Assistant
  'assigned',            -- Assigned to Assistant Planner by Unit Head
  'site_visit',          -- Site visit in progress
  'technical_report',    -- Technical report being prepared
  'head_review',         -- Under Department Head review
  'recommendation',      -- Recommendation provided
  'osc_meeting',         -- Pending OSC meeting decision
  'approved',            -- Approved by OSC
  'rejected',            -- Rejected by OSC
  'approved_with_amendments' -- Approved with plan amendments required
));

-- Change default status to osc_received
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'osc_received';

-- Create workflow_history table to track all workflow transitions
CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflow_history_application ON workflow_history(application_id);
CREATE INDEX idx_workflow_history_status ON workflow_history(to_status);

-- RLS for workflow_history
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_workflow_history" ON workflow_history FOR SELECT USING (true);
CREATE POLICY "officers_insert_workflow_history" ON workflow_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create site_visits table for lawatan tapak
CREATE TABLE IF NOT EXISTS site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  observations TEXT,
  technical_notes TEXT,
  site_condition TEXT,
  access_notes TEXT,
  surrounding_development TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_site_visits_application ON site_visits(application_id);
CREATE INDEX idx_site_visits_officer ON site_visits(officer_id);

-- RLS for site_visits
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_site_visits" ON site_visits FOR SELECT USING (true);
CREATE POLICY "officers_manage_site_visits" ON site_visits FOR ALL USING (auth.uid() IS NOT NULL);

-- Create site_photos table for photos during lawatan tapak
CREATE TABLE IF NOT EXISTS site_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_visit_id UUID NOT NULL REFERENCES site_visits(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  location_description TEXT,
  photo_type TEXT CHECK (photo_type IN ('site_overview', 'access', 'surrounding', 'existing_structure', 'other')),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_site_photos_visit ON site_photos(site_visit_id);

-- RLS for site_photos
ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_site_photos" ON site_photos FOR SELECT USING (true);
CREATE POLICY "officers_manage_site_photos" ON site_photos FOR ALL USING (auth.uid() IS NOT NULL);

-- Create report_templates table for different report types
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT CHECK (template_type IN ('technical_report', 'recommendation_report', 'written_directive', 'form_c1', 'form_c2')),
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for report_templates
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_report_templates" ON report_templates FOR SELECT USING (true);
CREATE POLICY "admin_manage_report_templates" ON report_templates FOR ALL USING (auth.uid() IS NOT NULL);

-- Create generated_reports table to store all auto-generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('technical_report', 'recommendation_report', 'written_directive', 'form_c1', 'form_c2')),
  report_content TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_path TEXT,
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_reports_application ON generated_reports(application_id);
CREATE INDEX idx_generated_reports_type ON generated_reports(report_type);

-- RLS for generated_reports
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_generated_reports" ON generated_reports FOR SELECT USING (true);
CREATE POLICY "officers_manage_generated_reports" ON generated_reports FOR ALL USING (auth.uid() IS NOT NULL);

-- Create written_directives table for Arahan Bertulis requiring YDP signature
CREATE TABLE IF NOT EXISTS written_directives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  directive_number TEXT,
  directive_content TEXT NOT NULL,
  prepared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('draft', 'pending_review', 'pending_signature', 'signed', 'sent_to_applicant')) DEFAULT 'draft',
  prepared_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_date TIMESTAMP WITH TIME ZONE,
  sent_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_written_directives_application ON written_directives(application_id);
CREATE INDEX idx_written_directives_status ON written_directives(status);

-- RLS for written_directives
ALTER TABLE written_directives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_written_directives" ON written_directives FOR SELECT USING (true);
CREATE POLICY "officers_manage_written_directives" ON written_directives FOR ALL USING (auth.uid() IS NOT NULL);

-- Create osc_decisions table for OSC meeting decisions
CREATE TABLE IF NOT EXISTS osc_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_number TEXT,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('lulus', 'tolak', 'lulus_dengan_pindaan')),
  approval_conditions TEXT,
  rejection_reasons TEXT,
  amendment_requirements TEXT,
  recorded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_osc_decisions_application ON osc_decisions(application_id);
CREATE INDEX idx_osc_decisions_type ON osc_decisions(decision_type);

-- RLS for osc_decisions
ALTER TABLE osc_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_osc_decisions" ON osc_decisions FOR SELECT USING (true);
CREATE POLICY "officers_manage_osc_decisions" ON osc_decisions FOR ALL USING (auth.uid() IS NOT NULL);

-- Create approved_plans table for pelan lulus registration
CREATE TABLE IF NOT EXISTS approved_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  plan_registration_number TEXT NOT NULL,
  endorsed_date DATE NOT NULL,
  endorsed_by TEXT,
  plan_file_path TEXT,
  endorsement_stamp_path TEXT,
  registered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approved_plans_application ON approved_plans(application_id);
CREATE INDEX idx_approved_plans_registration ON approved_plans(plan_registration_number);

-- RLS for approved_plans
ALTER TABLE approved_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_approved_plans" ON approved_plans FOR SELECT USING (true);
CREATE POLICY "officers_manage_approved_plans" ON approved_plans FOR ALL USING (auth.uid() IS NOT NULL);

-- Add columns to applications for workflow tracking
ALTER TABLE applications ADD COLUMN IF NOT EXISTS unit_head_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS department_head_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS site_visit_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS technical_report_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS head_review_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS osc_meeting_date DATE;

-- Create indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_applications_unit_head ON applications(unit_head_id);
CREATE INDEX IF NOT EXISTS idx_applications_dept_head ON applications(department_head_id);
CREATE INDEX IF NOT EXISTS idx_applications_registered_by ON applications(registered_by);