-- Add yang_dipertua_name field to written_directives table if it doesn't exist
ALTER TABLE written_directives
ADD COLUMN IF NOT EXISTS yang_dipertua_name TEXT DEFAULT 'YB. Dato'' Haji Ahmad bin Abdullah';

COMMENT ON COLUMN written_directives.yang_dipertua_name IS 'Name of Yang Dipertua for signature block - defaults to current YDP';

-- Add alamat_pemohon field if it doesn't exist (for address block in A(1))
ALTER TABLE written_directives
ADD COLUMN IF NOT EXISTS alamat_pemohon TEXT;

COMMENT ON COLUMN written_directives.alamat_pemohon IS 'Full postal address of applicant for Kepada block in Borang A(1)';