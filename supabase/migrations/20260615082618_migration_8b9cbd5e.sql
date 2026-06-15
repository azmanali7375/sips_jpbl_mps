-- Drop the duplicate column attempts and only add the truly new columns
ALTER TABLE osc_decisions
DROP COLUMN IF EXISTS no_mesyuarat,
DROP COLUMN IF EXISTS tarikh_mesyuarat_osc;

-- Add only the new columns that don't exist yet
ALTER TABLE osc_decisions
ADD COLUMN IF NOT EXISTS no_pelan_lulus TEXT,
ADD COLUMN IF NOT EXISTS tarikh_kelulusan DATE,
ADD COLUMN IF NOT EXISTS alamat_pemohon TEXT,
ADD COLUMN IF NOT EXISTS jenis_permohonan TEXT,
ADD COLUMN IF NOT EXISTS yang_dipertua_name TEXT DEFAULT 'YB. Dato'' Haji Ahmad bin Abdullah',
ADD COLUMN IF NOT EXISTS is_exempt_caj BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS additional_sk_recipients TEXT[];