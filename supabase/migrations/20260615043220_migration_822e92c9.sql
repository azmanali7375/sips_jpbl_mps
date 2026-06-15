-- Add missing fields to written_directives table for Written Directives (Arahan Bertulis) management
ALTER TABLE written_directives 
ADD COLUMN IF NOT EXISTS jenis_borang TEXT,
ADD COLUMN IF NOT EXISTS tarikh_dikeluarkan DATE,
ADD COLUMN IF NOT EXISTS arahan TEXT,
ADD COLUMN IF NOT EXISTS tarikh_pematuhan_dikehendaki DATE,
ADD COLUMN IF NOT EXISTS tarikh_pematuhan_diterima DATE,
ADD COLUMN IF NOT EXISTS status_pematuhan TEXT DEFAULT 'Menunggu',
ADD COLUMN IF NOT EXISTS catatan TEXT;

-- Add constraints for new fields
ALTER TABLE written_directives 
DROP CONSTRAINT IF EXISTS written_directives_jenis_borang_check;

ALTER TABLE written_directives 
ADD CONSTRAINT written_directives_jenis_borang_check 
CHECK (jenis_borang IN ('Borang A1 KPPA – Arahan Bertulis', 'Borang A2 KPPA – Pematuhan Arahan'));

ALTER TABLE written_directives 
DROP CONSTRAINT IF EXISTS written_directives_status_pematuhan_check;

ALTER TABLE written_directives 
ADD CONSTRAINT written_directives_status_pematuhan_check 
CHECK (status_pematuhan IN ('Menunggu', 'Patuh', 'Gagal Patuh'));

-- Add comments for new fields
COMMENT ON COLUMN written_directives.jenis_borang IS 'Form type: Borang A1 KPPA – Arahan Bertulis / Borang A2 KPPA – Pematuhan Arahan';
COMMENT ON COLUMN written_directives.tarikh_dikeluarkan IS 'Date directive was issued';
COMMENT ON COLUMN written_directives.arahan IS 'Written instruction content (Arahan Bertulis)';
COMMENT ON COLUMN written_directives.tarikh_pematuhan_dikehendaki IS 'Compliance deadline date';
COMMENT ON COLUMN written_directives.tarikh_pematuhan_diterima IS 'Date applicant submitted compliance (nullable)';
COMMENT ON COLUMN written_directives.status_pematuhan IS 'Compliance status: Menunggu / Patuh / Gagal Patuh';
COMMENT ON COLUMN written_directives.catatan IS 'Additional notes';