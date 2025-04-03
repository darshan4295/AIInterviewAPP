/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing policies
    - Create new policies with proper security checks
    - Allow profile creation during signup
    - Ensure email matches auth.email()

  2. Security
    - Maintain RLS enabled on profiles table
    - Verify both user ID and email match
    - Prevent unauthorized access
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

-- Create new policies with proper security checks
CREATE POLICY "Allow users to create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id AND 
  auth.email() = email
);

CREATE POLICY "Allow users to read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id AND 
  auth.email() = email
);

CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id AND 
  auth.email() = email
)
WITH CHECK (
  auth.uid() = id AND 
  auth.email() = email
);