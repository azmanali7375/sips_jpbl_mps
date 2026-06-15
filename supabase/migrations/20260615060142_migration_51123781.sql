-- Create laporan_teknikal table
CREATE TABLE IF NOT EXISTS laporan_teknikal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  no_rujukan_fail TEXT,
  is_kmt BOOLEAN DEFAULT false,
  status_laporan TEXT DEFAULT 'Draf' CHECK (status_laporan IN ('Draf', 'Dikemukakan', 'Disahkan')),
  bahagian_a TEXT,
  bahagian_b JSONB,
  bahagian_c JSONB,
  bahagian_d JSONB,
  bahagian_e JSONB,
  bahagian_f JSONB,
  bahagian_g JSONB,
  ulasan_syor_f TEXT,
  ulasan_syor_g TEXT,
  disediakan_oleh TEXT,
  jawatan_penyedia TEXT,
  tarikh_disediakan DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_laporan_teknikal_application_id ON laporan_teknikal(application_id);

-- Enable RLS
ALTER TABLE laporan_teknikal ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "laporan_teknikal_select" ON laporan_teknikal FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "laporan_teknikal_insert" ON laporan_teknikal FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "laporan_teknikal_update" ON laporan_teknikal FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "laporan_teknikal_delete" ON laporan_teknikal FOR DELETE USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_laporan_teknikal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER laporan_teknikal_updated_at
  BEFORE UPDATE ON laporan_teknikal
  FOR EACH ROW
  EXECUTE FUNCTION update_laporan_teknikal_updated_at();

-- Add comments
COMMENT ON TABLE laporan_teknikal IS 'Technical reports for development applications';
COMMENT ON COLUMN laporan_teknikal.is_kmt IS 'Is this a KMT (Limited Planning Permission) application';
COMMENT ON COLUMN laporan_teknikal.status_laporan IS 'Report status: Draf, Dikemukakan, or Disahkan';
COMMENT ON COLUMN laporan_teknikal.bahagian_a IS 'Section A: Document completeness';
COMMENT ON COLUMN laporan_teknikal.bahagian_b IS 'Section B: Site information (JSONB)';
COMMENT ON COLUMN laporan_teknikal.bahagian_c IS 'Section C: Development proposal details (JSONB)';
COMMENT ON COLUMN laporan_teknikal.bahagian_d IS 'Section D: Planning guidelines compliance (JSONB)';
COMMENT ON COLUMN laporan_teknikal.bahagian_e IS 'Section E: Technical analysis (JSONB)';
COMMENT ON COLUMN laporan_teknikal.bahagian_f IS 'Section F: Recommendations (JSONB)';
COMMENT ON COLUMN laporan_teknikal.bahagian_g IS 'Section G: KMT specific requirements (JSONB)';