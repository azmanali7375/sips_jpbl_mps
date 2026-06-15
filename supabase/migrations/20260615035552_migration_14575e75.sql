-- Add OSC-specific fields to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS no_fail_jpl text UNIQUE,
ADD COLUMN IF NOT EXISTS no_permohonan_osc text,
ADD COLUMN IF NOT EXISTS kategori_permohonan text,
ADD COLUMN IF NOT EXISTS skala_pembangunan text,
ADD COLUMN IF NOT EXISTS jenis_proses_pr text DEFAULT 'Tidak',
ADD COLUMN IF NOT EXISTS status_semakan_osc text,
ADD COLUMN IF NOT EXISTS tarikh_penghantaran date,
ADD COLUMN IF NOT EXISTS tarikh_lengkap_diterima_osc date,
ADD COLUMN IF NOT EXISTS tarikh_kpi date,
ADD COLUMN IF NOT EXISTS nama_sp text,
ADD COLUMN IF NOT EXISTS no_kp_sp text,
ADD COLUMN IF NOT EXISTS nama_pemaju_pemilik text,
ADD COLUMN IF NOT EXISTS tajuk_permohonan text,
ADD COLUMN IF NOT EXISTS lokasi_mercu_tanda text,
ADD COLUMN IF NOT EXISTS mukim text,
ADD COLUMN IF NOT EXISTS daerah text DEFAULT 'Segamat',
ADD COLUMN IF NOT EXISTS negeri text DEFAULT 'Johor',
ADD COLUMN IF NOT EXISTS rancangan_tempatan text,
ADD COLUMN IF NOT EXISTS zoning text,
ADD COLUMN IF NOT EXISTS longitud decimal(10,8),
ADD COLUMN IF NOT EXISTS latitud decimal(10,8),
ADD COLUMN IF NOT EXISTS jabatan_memperaku text DEFAULT 'Jabatan Perancangan Bandar & Desa (JPBL)',
ADD COLUMN IF NOT EXISTS status_dalaman text DEFAULT 'Diterima',
ADD COLUMN IF NOT EXISTS catatan_dalaman text;

-- Add check constraint for skala_pembangunan
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_skala_pembangunan_check;
ALTER TABLE applications ADD CONSTRAINT applications_skala_pembangunan_check 
CHECK (skala_pembangunan IN ('Kecil', 'Sederhana', 'Besar A', 'Besar B'));

-- Add check constraint for jenis_proses_pr
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_jenis_proses_pr_check;
ALTER TABLE applications ADD CONSTRAINT applications_jenis_proses_pr_check 
CHECK (jenis_proses_pr IN ('Ya', 'Tidak'));

-- Add check constraint for rancangan_tempatan
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_rancangan_tempatan_check;
ALTER TABLE applications ADD CONSTRAINT applications_rancangan_tempatan_check 
CHECK (rancangan_tempatan IN ('Ya', 'Tidak'));

-- Add check constraint for status_dalaman
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_dalaman_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_dalaman_check 
CHECK (status_dalaman IN (
  'Diterima', 
  'Dalam Semakan Teknikal', 
  'Menunggu Ulasan ATD', 
  'Kertas Perakuan Disediakan', 
  'Menunggu OSC', 
  'Lulus', 
  'Lulus Bersyarat', 
  'Ditolak', 
  'Dibatalkan'
));

-- Create sequence for JPL file numbering
CREATE SEQUENCE IF NOT EXISTS jpl_file_number_seq START WITH 1;

-- Create function to generate JPL file number
CREATE OR REPLACE FUNCTION generate_jpl_file_number()
RETURNS text AS $$
DECLARE
  current_year text;
  next_seq int;
  new_number text;
BEGIN
  current_year := to_char(now(), 'YYYY');
  next_seq := nextval('jpl_file_number_seq');
  new_number := 'JPL/KM/' || current_year || '/' || lpad(next_seq::text, 3, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Add index for no_fail_jpl
CREATE INDEX IF NOT EXISTS idx_applications_no_fail_jpl ON applications(no_fail_jpl);

-- Add index for no_permohonan_osc
CREATE INDEX IF NOT EXISTS idx_applications_no_permohonan_osc ON applications(no_permohonan_osc);

COMMENT ON COLUMN applications.no_fail_jpl IS 'JPL internal file number (auto-generated)';
COMMENT ON COLUMN applications.no_permohonan_osc IS 'OSC application reference number';
COMMENT ON COLUMN applications.tarikh_lengkap_diterima_osc IS 'Complete received date from OSC - used as KPI start date';
COMMENT ON COLUMN applications.tarikh_kpi IS 'KPI deadline date (auto-calculated: tarikh_lengkap_diterima_osc + 57 days)';