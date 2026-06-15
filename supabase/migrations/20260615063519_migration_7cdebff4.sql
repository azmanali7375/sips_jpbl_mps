-- Add pdf_url field to laporan_teknikal table
ALTER TABLE laporan_teknikal 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

COMMENT ON COLUMN laporan_teknikal.pdf_url IS 'URL to the generated PDF file';