-- Update site_visits table to add missing fields for Lawatan Tapak form
ALTER TABLE site_visits
ADD COLUMN IF NOT EXISTS masa_lawatan time,
ADD COLUMN IF NOT EXISTS tujuan_lawatan text,
ADD COLUMN IF NOT EXISTS penemuan text,
ADD COLUMN IF NOT EXISTS tindakan_susulan text,
ADD COLUMN IF NOT EXISTS status_lawatan text DEFAULT 'Dirancang';

-- Add constraints for status_lawatan
ALTER TABLE site_visits
DROP CONSTRAINT IF EXISTS site_visits_status_lawatan_check;

ALTER TABLE site_visits
ADD CONSTRAINT site_visits_status_lawatan_check 
CHECK (status_lawatan IN ('Dirancang', 'Selesai', 'Ditunda', 'Dibatalkan'));

-- Add constraints for tujuan_lawatan
ALTER TABLE site_visits
DROP CONSTRAINT IF EXISTS site_visits_tujuan_lawatan_check;

ALTER TABLE site_visits
ADD CONSTRAINT site_visits_tujuan_lawatan_check 
CHECK (tujuan_lawatan IN ('Semakan Zon Tapak', 'Pengesahan Setback', 'Pemantauan Kepatuhan', 'Lawatan Umum'));

-- Update site_photos table to add tarikh_gambar
ALTER TABLE site_photos
ADD COLUMN IF NOT EXISTS tarikh_gambar date DEFAULT CURRENT_DATE;

-- Add comments
COMMENT ON COLUMN site_visits.masa_lawatan IS 'Visit time';
COMMENT ON COLUMN site_visits.tujuan_lawatan IS 'Purpose of visit: Semakan Zon Tapak / Pengesahan Setback / Pemantauan Kepatuhan / Lawatan Umum';
COMMENT ON COLUMN site_visits.penemuan IS 'Site visit findings';
COMMENT ON COLUMN site_visits.tindakan_susulan IS 'Follow-up actions required';
COMMENT ON COLUMN site_visits.status_lawatan IS 'Visit status: Dirancang / Selesai / Ditunda / Dibatalkan';
COMMENT ON COLUMN site_photos.tarikh_gambar IS 'Photo date';