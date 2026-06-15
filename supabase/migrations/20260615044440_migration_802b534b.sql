-- Update documents table to add OSC document management fields
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS jenis_dokumen text,
ADD COLUMN IF NOT EXISTS versi text,
ADD COLUMN IF NOT EXISTS catatan text;

-- Add CHECK constraint for jenis_dokumen
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_jenis_dokumen_check;
ALTER TABLE documents ADD CONSTRAINT documents_jenis_dokumen_check 
  CHECK (jenis_dokumen IN (
    'Pelan Susun Atur',
    'Pelan Bangunan',
    'Pelan CAD',
    'Kebenaran Tanah',
    'Laporan Teknikal',
    'Surat Pemohon',
    'Dokumen OSC',
    'Lain-lain'
  ));

-- Add helpful comments
COMMENT ON COLUMN documents.jenis_dokumen IS 'Document type from OSC categories';
COMMENT ON COLUMN documents.versi IS 'Document version (e.g., v1, v2) for tracking amendments';
COMMENT ON COLUMN documents.catatan IS 'Additional notes about the document';