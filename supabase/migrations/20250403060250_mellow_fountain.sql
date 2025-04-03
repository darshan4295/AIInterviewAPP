/*
  # Implement permissive RLS policies for profiles

  1. Changes
    - Drop all existing policies
    - Create a single permissive policy for profile creation
    - Maintain secure policies for read and update operations
    - Remove all email-based checks

  2. Security
    - Keep RLS enabled on profiles table
    - Allow initial profile creation
    - Restrict profile access to owners
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

-- Create new simplified and permissive policies
CREATE POLICY "Allow profile creation"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);