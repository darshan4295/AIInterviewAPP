/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing policies
    - Create new simplified policy for authenticated users
    - Allow users to manage their own profiles
    - Enable proper profile creation during signup

  2. Security
    - Maintain RLS enabled on profiles table
    - Ensure users can only access their own profiles
    - Allow profile creation during signup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile management" ON profiles;
DROP POLICY IF EXISTS "Enable all operations for users based on user_id" ON profiles;

-- Create new simplified policy
CREATE POLICY "Enable all operations for users based on user_id"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);