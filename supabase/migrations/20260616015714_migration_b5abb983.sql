-- Fix profiles table with NON-RECURSIVE policies
-- Drop all existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- Simple self-access policies (NO recursion)
CREATE POLICY "profiles_self_read" ON public.profiles
FOR SELECT TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "profiles_self_insert" ON public.profiles
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON public.profiles
FOR UPDATE TO authenticated 
USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admin operations will be handled at application layer with service role key
-- This avoids RLS recursion issues