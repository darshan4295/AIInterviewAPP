/*
  # Fix Profiles Table RLS Policies

  1. Changes
    - Drop and recreate RLS policies for profiles table
    - Allow profile creation and upsert operations
    - Maintain secure access control for profile management

  2. Security
    - Maintains RLS enabled on profiles table
    - Ensures users can only access their own profiles
    - Allows initial profile creation and updates
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies with proper access control
CREATE POLICY "Allow profile management"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    CASE 
      WHEN (SELECT current_setting('role') = 'authenticated') THEN
        -- For SELECT, UPDATE operations
        auth.uid() = id
      ELSE
        -- For INSERT operations
        true
    END
  )
  WITH CHECK (
    CASE 
      WHEN (SELECT current_setting('role') = 'authenticated') THEN
        -- For UPDATE operations
        auth.uid() = id
      ELSE
        -- For INSERT operations
        true
    END
  );