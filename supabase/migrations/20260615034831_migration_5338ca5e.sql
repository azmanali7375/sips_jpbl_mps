-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS staff_id TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS organisation TEXT;

-- Create unique index on staff_id
CREATE UNIQUE INDEX IF NOT EXISTS profiles_staff_id_key ON profiles(staff_id) WHERE staff_id IS NOT NULL;