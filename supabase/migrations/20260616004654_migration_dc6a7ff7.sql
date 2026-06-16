-- Create kertas_perakuan table
CREATE TABLE IF NOT EXISTS kertas_perakuan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  no_fail TEXT,
  no_id_online TEXT,
  tarikh_permohonan_lengkap DATE,
  juru_perunding_nama TEXT,
  juru_perunding_syarikat TEXT,
  luas_m2 DECIMAL(10,2),
  luas_hektar DECIMAL(10,4),
  luas_ekar DECIMAL(10,4),
  perakuan_teks TEXT,
  syor_perakuan TEXT CHECK (syor_perakuan IN ('Syor Lulus', 'Syor Lulus dengan Pindaan Pelan', 'Syor Tangguh', 'Syor Tolak')),
  syarat_perakuan TEXT,
  disediakan_oleh TEXT,
  jawatan TEXT,
  tarikh DATE,
  status TEXT DEFAULT 'Draf' CHECK (status IN ('Draf', 'Dikemukakan')),
  pdf_url TEXT,
  osc_upload_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE kertas_perakuan ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kertas_perakuan
CREATE POLICY "kertas_perakuan_select" ON kertas_perakuan
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND status = 'Aktif'
    AND role IN ('admin', 'ketua_unit', 'pegawai', 'penolong', 'viewer')
  )
);

CREATE POLICY "kertas_perakuan_insert" ON kertas_perakuan
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND status = 'Aktif'
    AND role IN ('admin', 'ketua_unit')
  )
);

CREATE POLICY "kertas_perakuan_update" ON kertas_perakuan
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND status = 'Aktif'
    AND role IN ('admin', 'ketua_unit')
  )
);

CREATE POLICY "kertas_perakuan_delete" ON kertas_perakuan
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND status = 'Aktif'
    AND role = 'admin'
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kertas_perakuan_application ON kertas_perakuan(application_id);
CREATE INDEX IF NOT EXISTS idx_kertas_perakuan_status ON kertas_perakuan(status);

-- Add comments
COMMENT ON TABLE kertas_perakuan IS 'Formal HOD endorsement papers for OSC committee';
COMMENT ON COLUMN kertas_perakuan.syor_perakuan IS 'Recommendation: Syor Lulus / Syor Lulus dengan Pindaan Pelan / Syor Tangguh / Syor Tolak';