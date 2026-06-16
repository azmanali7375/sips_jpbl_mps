-- STEP 1: Create public_holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarikh DATE NOT NULL UNIQUE,
  nama_cuti TEXT NOT NULL,
  jenis_cuti TEXT,
  tahun INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "public_holidays_read" ON public_holidays
FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "public_holidays_admin_write" ON public_holidays
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_public_holidays_tarikh ON public_holidays(tarikh);
CREATE INDEX IF NOT EXISTS idx_public_holidays_tahun ON public_holidays(tahun);