-- Update reviews table to add technical review fields
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS jenis_semakan TEXT CHECK (jenis_semakan IN ('Semakan Pertama', 'Semakan Pindaan', 'Semakan Ulangan')),
ADD COLUMN IF NOT EXISTS tarikh_semakan DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS kaedah_semakan TEXT CHECK (kaedah_semakan IN ('Manual', 'SIPS Auto-Check', 'GIS Overlay', 'Hybrid')),
ADD COLUMN IF NOT EXISTS keputusan_semakan TEXT CHECK (keputusan_semakan IN ('Lulus', 'Lulus Bersyarat', 'Pindaan Diperlukan', 'Tolak')),
ADD COLUMN IF NOT EXISTS ringkasan_ulasan TEXT,
ADD COLUMN IF NOT EXISTS syarat_syarat TEXT,
ADD COLUMN IF NOT EXISTS cadangan_kepada_osc TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comments for new fields
COMMENT ON COLUMN reviews.jenis_semakan IS 'Type of review: Semakan Pertama / Semakan Pindaan / Semakan Ulangan';
COMMENT ON COLUMN reviews.tarikh_semakan IS 'Date of technical review';
COMMENT ON COLUMN reviews.kaedah_semakan IS 'Review method: Manual / SIPS Auto-Check / GIS Overlay / Hybrid';
COMMENT ON COLUMN reviews.keputusan_semakan IS 'Review decision: Lulus / Lulus Bersyarat / Pindaan Diperlukan / Tolak';
COMMENT ON COLUMN reviews.ringkasan_ulasan IS 'Summary of technical review comments';
COMMENT ON COLUMN reviews.syarat_syarat IS 'Conditions if applicable';
COMMENT ON COLUMN reviews.cadangan_kepada_osc IS 'Recommendations to OSC';