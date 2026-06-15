-- Create land_lots table for managing land information linked to applications
CREATE TABLE IF NOT EXISTS land_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  jenis_lot TEXT NOT NULL, -- e.g., Lot, Pajakan, Rezab
  no_lot TEXT NOT NULL, -- e.g., LOT 11968
  pemilik_tanah TEXT, -- Land owner name
  kategori TEXT, -- Bangunan / Pertanian / Perindustrian / Rizab Kerajaan / Lain-lain
  syarat_nyata TEXT, -- Title condition
  catatan TEXT, -- Optional notes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for land_lots
ALTER TABLE land_lots ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read land lots
CREATE POLICY "Users can view land lots"
  ON land_lots FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert land lots
CREATE POLICY "Users can insert land lots"
  ON land_lots FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update land lots
CREATE POLICY "Users can update land lots"
  ON land_lots FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete land lots
CREATE POLICY "Users can delete land lots"
  ON land_lots FOR DELETE
  TO authenticated
  USING (true);

-- Add index for faster lookups by application_id
CREATE INDEX IF NOT EXISTS idx_land_lots_application_id ON land_lots(application_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_land_lots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_land_lots_updated_at
  BEFORE UPDATE ON land_lots
  FOR EACH ROW
  EXECUTE FUNCTION update_land_lots_updated_at();

COMMENT ON TABLE land_lots IS 'Land lot information linked to planning applications (Maklumat Tanah)';
COMMENT ON COLUMN land_lots.jenis_lot IS 'Type of lot (e.g., Lot, Pajakan, Rezab)';
COMMENT ON COLUMN land_lots.no_lot IS 'Lot number from OSC';
COMMENT ON COLUMN land_lots.pemilik_tanah IS 'Land owner name';
COMMENT ON COLUMN land_lots.kategori IS 'Land category: Bangunan / Pertanian / Perindustrian / Rizab Kerajaan / Lain-lain';
COMMENT ON COLUMN land_lots.syarat_nyata IS 'Title condition (Syarat Nyata)';