-- Add jenis_aplikasi and kpi_hari fields to applications table
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS jenis_aplikasi text CHECK (jenis_aplikasi IN ('KM', 'PB')),
ADD COLUMN IF NOT EXISTS kpi_hari integer;

-- Add comments
COMMENT ON COLUMN applications.jenis_aplikasi IS 'Application type: KM (Kebenaran Merancang) or PB (Pelan Bangunan) - auto-detected from no_permohonan_osc prefix';
COMMENT ON COLUMN applications.kpi_hari IS 'KPI target days: KM=57 days, PB=14 days - auto-set based on jenis_aplikasi';

-- Create function to auto-detect jenis_aplikasi and set kpi_hari
CREATE OR REPLACE FUNCTION set_jenis_aplikasi_and_kpi()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-detect from no_permohonan_osc
  IF NEW.no_permohonan_osc LIKE 'MPSEG-KM%' THEN
    NEW.jenis_aplikasi := 'KM';
    NEW.kpi_hari := 57;
  ELSIF NEW.no_permohonan_osc LIKE 'MPSEG-PB%' THEN
    NEW.jenis_aplikasi := 'PB';
    NEW.kpi_hari := 14;
  ELSE
    -- Default to KM if pattern doesn't match
    NEW.jenis_aplikasi := 'KM';
    NEW.kpi_hari := 57;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_jenis_aplikasi_and_kpi ON applications;
CREATE TRIGGER trigger_set_jenis_aplikasi_and_kpi
  BEFORE INSERT OR UPDATE OF no_permohonan_osc ON applications
  FOR EACH ROW
  EXECUTE FUNCTION set_jenis_aplikasi_and_kpi();

-- Update existing records
UPDATE applications
SET jenis_aplikasi = CASE
  WHEN no_permohonan_osc LIKE 'MPSEG-KM%' THEN 'KM'
  WHEN no_permohonan_osc LIKE 'MPSEG-PB%' THEN 'PB'
  ELSE 'KM'
END,
kpi_hari = CASE
  WHEN no_permohonan_osc LIKE 'MPSEG-KM%' THEN 57
  WHEN no_permohonan_osc LIKE 'MPSEG-PB%' THEN 14
  ELSE 57
END;