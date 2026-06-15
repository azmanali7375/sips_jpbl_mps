-- Add required fields to osc_decisions table for Borang C(1)
ALTER TABLE osc_decisions
ADD COLUMN IF NOT EXISTS no_pelan_lulus TEXT,
ADD COLUMN IF NOT EXISTS tarikh_kelulusan DATE,
ADD COLUMN IF NOT EXISTS alamat_pemohon TEXT,
ADD COLUMN IF NOT EXISTS jenis_permohonan TEXT,
ADD COLUMN IF NOT EXISTS yang_dipertua_name TEXT DEFAULT 'YB. Dato'' Haji Ahmad bin Abdullah',
ADD COLUMN IF NOT EXISTS is_exempt_caj BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS additional_sk_recipients TEXT[];

COMMENT ON COLUMN osc_decisions.no_pelan_lulus IS 'Pelan lulus reference number';
COMMENT ON COLUMN osc_decisions.tarikh_kelulusan IS 'Official approval date for C1';
COMMENT ON COLUMN osc_decisions.alamat_pemohon IS 'Full postal address of applicant';
COMMENT ON COLUMN osc_decisions.jenis_permohonan IS 'Susunatur or Pembinaan';
COMMENT ON COLUMN osc_decisions.yang_dipertua_name IS 'Name of Yang Dipertua for signature';
COMMENT ON COLUMN osc_decisions.is_exempt_caj IS 'True if exempt from Caj Pemajuan - defaults to true until payment system is implemented';