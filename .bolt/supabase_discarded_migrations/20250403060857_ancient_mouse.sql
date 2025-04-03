/*
  # Fix profile creation RLS policies

  1. Changes
    - Drop existing policies to start fresh
    - Create permissive INSERT policy for profile creation
    - Allow reading all profiles
    - Maintain secure profile updates

  2. Security
    - Enable profile creation during signup
    - Allow reading all profiles for user lookup
    - Restrict profile updates to owners
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile management" ON profiles;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Allow users to create their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow reading all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow updating own profile" ON profiles;

-- Create new policies
CREATE POLICY "Allow profile creation"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow reading all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow updating own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);