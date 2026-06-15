-- Add missing columns to osc_decisions table
ALTER TABLE osc_decisions 
ADD COLUMN tempoh_sah_kelulusan INTEGER DEFAULT 2,
ADD COLUMN no_kelulusan_km TEXT,
ADD COLUMN catatan_osc TEXT;

-- Update decision_type constraint to include Lulus Bersyarat and Ditangguhkan
ALTER TABLE osc_decisions 
DROP CONSTRAINT IF EXISTS osc_decisions_decision_type_check;

ALTER TABLE osc_decisions 
ADD CONSTRAINT osc_decisions_decision_type_check 
CHECK (decision_type IN ('Lulus', 'Lulus Bersyarat', 'Ditangguhkan', 'Ditolak'));

-- Add missing columns to approved_plans table for auto-creation from OSC decision
ALTER TABLE approved_plans
ADD COLUMN tarikh_kelulusan DATE,
ADD COLUMN tarikh_tamat_sah DATE,
ADD COLUMN syarat_kelulusan TEXT;

COMMENT ON COLUMN osc_decisions.tempoh_sah_kelulusan IS 'Validity period in years (default 2)';
COMMENT ON COLUMN osc_decisions.no_kelulusan_km IS 'Official KM approval number';
COMMENT ON COLUMN osc_decisions.catatan_osc IS 'OSC meeting notes';
COMMENT ON COLUMN approved_plans.tarikh_kelulusan IS 'Approval date (from OSC meeting)';
COMMENT ON COLUMN approved_plans.tarikh_tamat_sah IS 'Expiry date (tarikh_kelulusan + validity period)';
COMMENT ON COLUMN approved_plans.syarat_kelulusan IS 'Approval conditions from OSC';