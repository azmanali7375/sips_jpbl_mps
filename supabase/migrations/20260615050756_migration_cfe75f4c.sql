-- Add template_id column to generated_reports table
ALTER TABLE generated_reports 
ADD COLUMN template_id uuid NULL,
ADD CONSTRAINT generated_reports_template_id_fkey 
  FOREIGN KEY (template_id) 
  REFERENCES report_templates(id) 
  ON DELETE SET NULL;

-- Add index for template lookups
CREATE INDEX idx_generated_reports_template ON generated_reports(template_id);

-- Add status column (Draf / Muktamad) to replace is_finalized
ALTER TABLE generated_reports 
ADD COLUMN status text DEFAULT 'Draf',
ADD CONSTRAINT generated_reports_status_check 
  CHECK (status IN ('Draf', 'Muktamad'));

COMMENT ON COLUMN generated_reports.template_id IS 'Reference to the report template used';
COMMENT ON COLUMN generated_reports.status IS 'Report status: Draf or Muktamad';