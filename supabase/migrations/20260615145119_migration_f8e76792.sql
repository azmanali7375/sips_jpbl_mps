-- Just add the authentication workflow columns (no seed)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Menunggu Kelulusan' 
  CHECK (status IN ('Menunggu Kelulusan', 'Aktif', 'Tidak Aktif', 'Ditolak')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN profiles.status IS 'Account status: Menunggu Kelulusan, Aktif, Tidak Aktif, Ditolak';
COMMENT ON COLUMN profiles.approved_by IS 'Admin who approved the account';
COMMENT ON COLUMN profiles.approved_at IS 'Timestamp when account was approved';
COMMENT ON COLUMN profiles.rejection_reason IS 'Reason for rejection (if status is Ditolak)';
COMMENT ON COLUMN profiles.last_login IS 'Last login timestamp';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);