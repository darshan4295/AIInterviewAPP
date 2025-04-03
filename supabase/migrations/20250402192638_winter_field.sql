/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing policies
    - Create separate policies for different operations
    - Allow profile creation during signup
    - Restrict profile access to owners

  2. Security
    - Maintain RLS enabled on profiles table
    - Allow users to create their own profiles
    - Ensure users can only access their own profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile management" ON profiles;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON profiles;

-- Create separate policies for different operations
CREATE POLICY "Allow users to create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

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