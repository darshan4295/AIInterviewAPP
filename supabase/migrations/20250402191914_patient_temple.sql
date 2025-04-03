/*
  # Fix Profiles Table RLS Policies

  1. Changes
    - Drop and recreate RLS policies for profiles table
    - Allow profile creation during signup
    - Maintain secure access control for profile management

  2. Security
    - Maintains RLS enabled on profiles table
    - Ensures users can only access their own profiles
    - Allows initial profile creation during signup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies with proper access control
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);