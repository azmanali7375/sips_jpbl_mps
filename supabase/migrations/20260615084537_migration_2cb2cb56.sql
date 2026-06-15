-- Add nama_pemohon and tajuk_permohonan to written_directives for Borang A(1)
ALTER TABLE written_directives
ADD COLUMN IF NOT EXISTS nama_pemohon TEXT,
ADD COLUMN IF NOT EXISTS tajuk_permohonan TEXT;

COMMENT ON COLUMN written_directives.nama_pemohon IS 'Applicant name for Borang A(1) body text';
COMMENT ON COLUMN written_directives.tajuk_permohonan IS 'Application title/purpose for Borang A(1) body text';