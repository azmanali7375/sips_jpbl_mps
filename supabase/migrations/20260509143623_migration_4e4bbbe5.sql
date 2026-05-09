-- Create sequence first
CREATE SEQUENCE IF NOT EXISTS applications_seq;

-- Extend profiles table with DC-specific fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text CHECK (role IN ('applicant', 'officer', 'admin')) DEFAULT 'applicant',
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS phone text;

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number text UNIQUE NOT NULL DEFAULT 'DC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('applications_seq')::text, 4, '0'),
  applicant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  project_type text CHECK (project_type IN ('residential', 'commercial', 'industrial', 'mixed_use', 'institutional')),
  location text NOT NULL,
  lot_number text,
  plot_area numeric,
  plot_ratio numeric,
  building_height numeric,
  setback_front numeric,
  setback_rear numeric,
  setback_side numeric,
  land_use_zone text,
  status text CHECK (status IN ('submitted', 'under_review', 'revision_requested', 'approved', 'rejected')) DEFAULT 'submitted',
  assigned_officer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  decision_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text CHECK (file_type IN ('site_plan', 'floor_plan', 'elevation', 'cad_drawing', 'report', 'other')),
  file_extension text,
  file_size bigint,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at timestamp with time zone DEFAULT now()
);

-- Create compliance_rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text CHECK (rule_type IN ('plot_ratio', 'setback', 'height', 'zoning', 'custom')),
  zone_type text,
  min_value numeric,
  max_value numeric,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  officer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  decision text CHECK (decision IN ('approve', 'reject', 'request_revision', 'pending')),
  compliance_results jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text CHECK (type IN ('status_change', 'assignment', 'comment', 'submission')),
  title text NOT NULL,
  message text NOT NULL,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications (T2: Public read, authenticated write)
CREATE POLICY "public_read_applications" ON applications FOR SELECT USING (true);
CREATE POLICY "auth_insert_applications" ON applications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_applications" ON applications FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_applications" ON applications FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for documents (T2: Public read, authenticated write)
CREATE POLICY "public_read_documents" ON documents FOR SELECT USING (true);
CREATE POLICY "auth_insert_documents" ON documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_documents" ON documents FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_documents" ON documents FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for compliance_rules (T2: Public read, authenticated write)
CREATE POLICY "public_read_rules" ON compliance_rules FOR SELECT USING (true);
CREATE POLICY "admin_insert_rules" ON compliance_rules FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin_update_rules" ON compliance_rules FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete_rules" ON compliance_rules FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for reviews (T2: Public read, authenticated write)
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "officer_insert_reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "officer_update_reviews" ON reviews FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for notifications (T1: User can only see their own)
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_officer ON applications(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_reviews_application ON reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

-- Insert default compliance rules
INSERT INTO compliance_rules (rule_name, rule_type, zone_type, min_value, max_value, description) VALUES
('Residential Plot Ratio', 'plot_ratio', 'residential', 0.3, 1.5, 'Maximum plot ratio for residential zones'),
('Commercial Plot Ratio', 'plot_ratio', 'commercial', 0.5, 3.0, 'Maximum plot ratio for commercial zones'),
('Residential Height Limit', 'height', 'residential', 0, 15, 'Maximum building height in meters for residential zones'),
('Commercial Height Limit', 'height', 'commercial', 0, 30, 'Maximum building height in meters for commercial zones'),
('Front Setback Residential', 'setback', 'residential', 6, NULL, 'Minimum front setback in meters for residential'),
('Rear Setback Residential', 'setback', 'residential', 3, NULL, 'Minimum rear setback in meters for residential'),
('Side Setback Residential', 'setback', 'residential', 2, NULL, 'Minimum side setback in meters for residential')
ON CONFLICT DO NOTHING;