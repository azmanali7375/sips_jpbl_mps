-- Create caj_pemajuan table for tracking development charges
CREATE TABLE IF NOT EXISTS caj_pemajuan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  no_rujukan_caj TEXT,
  jumlah_caj DECIMAL(12,2),
  tarikh_notis DATE,
  tarikh_luput_bayar DATE,
  tarikh_bayar DATE,
  no_resit TEXT,
  status_caj TEXT NOT NULL DEFAULT 'Belum Dikira' CHECK (status_caj IN ('Belum Dikira', 'Menunggu Bayaran', 'Dibayar', 'Dikecualikan')),
  dikira_oleh TEXT,
  catatan TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE caj_pemajuan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read caj_pemajuan"
  ON caj_pemajuan FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert caj_pemajuan"
  ON caj_pemajuan FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update caj_pemajuan"
  ON caj_pemajuan FOR UPDATE
  TO authenticated
  USING (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_caj_pemajuan_application_id ON caj_pemajuan(application_id);

-- Add comments
COMMENT ON TABLE caj_pemajuan IS 'Development charge tracking - mandatory before issuing Borang C(1)';
COMMENT ON COLUMN caj_pemajuan.status_caj IS 'Belum Dikira | Menunggu Bayaran | Dibayar | Dikecualikan';
COMMENT ON COLUMN caj_pemajuan.tarikh_luput_bayar IS 'Payment deadline - typically tarikh_notis + 30 days';