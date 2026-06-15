-- Create agency_ulasan table
CREATE TABLE IF NOT EXISTS agency_ulasan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kod_agensi TEXT NOT NULL,
  nama_agensi TEXT NOT NULL,
  tarikh_ulasan DATE,
  ringkasan_ulasan TEXT,
  keputusan_agensi TEXT CHECK (keputusan_agensi IN (
    'Tiada Halangan',
    'Tiada Halangan dengan Syarat',
    'Belum Boleh Menyokong',
    'Tiada Ulasan'
  )) DEFAULT 'Tiada Ulasan',
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agency_ulasan_application ON agency_ulasan(application_id);
CREATE INDEX IF NOT EXISTS idx_agency_ulasan_kod ON agency_ulasan(kod_agensi);

-- RLS Policies
ALTER TABLE agency_ulasan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agency reviews"
  ON agency_ulasan FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert agency reviews"
  ON agency_ulasan FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agency reviews"
  ON agency_ulasan FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete agency reviews"
  ON agency_ulasan FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Function to seed standard agencies for KM applications
CREATE OR REPLACE FUNCTION seed_standard_agencies()
RETURNS TRIGGER AS $$
BEGIN
  -- Only seed for KM applications
  IF NEW.jenis_aplikasi = 'KM' THEN
    INSERT INTO agency_ulasan (application_id, kod_agensi, nama_agensi, keputusan_agensi)
    VALUES
      (NEW.id, 'JBK', 'Jabatan Bangunan MPS', 'Tiada Ulasan'),
      (NEW.id, 'JKA', 'Jabatan Khidmat Awam MPS', 'Tiada Ulasan'),
      (NEW.id, 'JPPH', 'Jabatan Pengurusan Pelupusan Harta MPS', 'Tiada Ulasan'),
      (NEW.id, 'IWK', 'Indah Water Konsortium', 'Tiada Ulasan'),
      (NEW.id, 'JKR', 'Jabatan Kerja Raya', 'Tiada Ulasan'),
      (NEW.id, 'JMG', 'Jabatan Mineral dan Geosains', 'Tiada Ulasan'),
      (NEW.id, 'JPS', 'Jabatan Pengairan dan Saliran', 'Tiada Ulasan'),
      (NEW.id, 'PBAN', 'SAJ Holdings', 'Tiada Ulasan'),
      (NEW.id, 'PLANMalaysia', 'PLANMalaysia Johor', 'Tiada Ulasan'),
      (NEW.id, 'PTD', 'Pejabat Tanah dan Daerah', 'Tiada Ulasan'),
      (NEW.id, 'SKMM', 'Suruhanjaya Komunikasi dan Multimedia Malaysia', 'Tiada Ulasan'),
      (NEW.id, 'SWCORP', 'Perbadanan Pengurusan Sisa Pepejal dan Pembersihan Awam', 'Tiada Ulasan'),
      (NEW.id, 'TNB', 'Tenaga Nasional Berhad', 'Tiada Ulasan');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-seed agencies on application insert
CREATE TRIGGER trigger_seed_agencies
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION seed_standard_agencies();

-- Comments
COMMENT ON TABLE agency_ulasan IS 'Agency technical reviews for KM applications';
COMMENT ON COLUMN agency_ulasan.kod_agensi IS 'Agency code (e.g., JBK, IWK, TNB)';
COMMENT ON COLUMN agency_ulasan.keputusan_agensi IS 'Agency decision on the application';