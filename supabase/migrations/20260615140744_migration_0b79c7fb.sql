-- Create ulasan_perancangan table
CREATE TABLE IF NOT EXISTS ulasan_perancangan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  no_rujukan_fail TEXT NOT NULL,
  seksyen_a_mylcp_score TEXT DEFAULT 'TB',
  seksyen_b_semakan_ulasan TEXT,
  seksyen_c_isu_berkaitan TEXT,
  seksyen_d_pindaan_pelan TEXT DEFAULT 'Tiada',
  seksyen_e_ulasan_keseluruhan TEXT,
  syor_jabatan TEXT CHECK (syor_jabatan IN ('Tiada Halangan', 'Tiada Halangan dengan Syarat', 'Tidak Menyokong', 'Perlu Pindaan Pelan')),
  disediakan_oleh TEXT,
  jawatan TEXT,
  tarikh DATE,
  status TEXT DEFAULT 'Draf' CHECK (status IN ('Draf', 'Dikemukakan')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE ulasan_perancangan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read ulasan_perancangan"
  ON ulasan_perancangan FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert ulasan_perancangan"
  ON ulasan_perancangan FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ulasan_perancangan"
  ON ulasan_perancangan FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete ulasan_perancangan"
  ON ulasan_perancangan FOR DELETE
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_ulasan_perancangan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ulasan_perancangan_updated_at
  BEFORE UPDATE ON ulasan_perancangan
  FOR EACH ROW
  EXECUTE FUNCTION update_ulasan_perancangan_updated_at();

COMMENT ON TABLE ulasan_perancangan IS 'JPL internal planning narrative review';
COMMENT ON COLUMN ulasan_perancangan.seksyen_a_mylcp_score IS 'MyLCP Score if applicable, default TB (Tidak Berkaitan)';
COMMENT ON COLUMN ulasan_perancangan.seksyen_b_semakan_ulasan IS 'Review findings from technical report';
COMMENT ON COLUMN ulasan_perancangan.seksyen_c_isu_berkaitan IS 'Issues related to the application';
COMMENT ON COLUMN ulasan_perancangan.seksyen_d_pindaan_pelan IS 'Plan amendments required';
COMMENT ON COLUMN ulasan_perancangan.seksyen_e_ulasan_keseluruhan IS 'Overall planning department review';
COMMENT ON COLUMN ulasan_perancangan.syor_jabatan IS 'Department recommendation';