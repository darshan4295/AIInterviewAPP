/*
  # Simplify RLS policies for profiles table

  1. Changes
    - Drop all existing policies
    - Create separate policies for each operation
    - Make INSERT policy fully permissive
    - Keep basic security for SELECT and UPDATE

  2. Security
    - Keep RLS enabled on profiles table
    - Allow any authenticated user to create a profile
    - Restrict read/update to profile owners
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
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON profiles;

-- Create new simplified policies
CREATE POLICY "Allow profile creation"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow reading own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow updating own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);