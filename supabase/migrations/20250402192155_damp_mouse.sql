/*
  # Fix Profiles Table RLS Policies

  1. Changes
    - Drop all existing policies for profiles table
    - Create a single, simple policy for all operations
    - Allow profile creation during signup
    - Ensure users can only access their own profiles

  2. Security
    - Maintains RLS enabled on profiles table
    - Allows initial profile creation
    - Restricts profile access to owners
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile management" ON profiles;

-- Create a simple, permissive policy for profile creation
CREATE POLICY "Enable all operations for users based on user_id"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    -- Allow all operations if the user is accessing their own profile
    auth.uid() = id
  )
  WITH CHECK (
    -- Allow creation of new profiles
    auth.uid() = id
  );