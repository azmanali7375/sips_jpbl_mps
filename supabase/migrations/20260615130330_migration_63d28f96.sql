-- Add new fields to applications table for OSC data
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS kawasan_pembangunan_m2 DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS nisbah_plot DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS kawasan_lantai_kasar_m2 DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS bil_tempat_letak_kereta INTEGER,
ADD COLUMN IF NOT EXISTS bil_tempat_letak_motosikal INTEGER,
ADD COLUMN IF NOT EXISTS bil_tempat_letak_oku INTEGER,
ADD COLUMN IF NOT EXISTS bil_unit INTEGER,
ADD COLUMN IF NOT EXISTS bil_tingkat INTEGER,
ADD COLUMN IF NOT EXISTS ketinggian_bangunan_m DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS jenis_guna_tanah TEXT,
ADD COLUMN IF NOT EXISTS komponen TEXT;

COMMENT ON COLUMN applications.kawasan_pembangunan_m2 IS 'Total development area in square meters';
COMMENT ON COLUMN applications.nisbah_plot IS 'Plot ratio (GFA / site area)';
COMMENT ON COLUMN applications.kawasan_lantai_kasar_m2 IS 'Gross Floor Area in square meters';
COMMENT ON COLUMN applications.bil_tempat_letak_kereta IS 'Number of car parking spaces';
COMMENT ON COLUMN applications.bil_tempat_letak_motosikal IS 'Number of motorcycle parking spaces';
COMMENT ON COLUMN applications.bil_tempat_letak_oku IS 'Number of OKU parking spaces';
COMMENT ON COLUMN applications.bil_unit IS 'Total number of units';
COMMENT ON COLUMN applications.bil_tingkat IS 'Number of floors';
COMMENT ON COLUMN applications.ketinggian_bangunan_m IS 'Building height in meters';
COMMENT ON COLUMN applications.jenis_guna_tanah IS 'Land use type from OSC';
COMMENT ON COLUMN applications.komponen IS 'Development component description';