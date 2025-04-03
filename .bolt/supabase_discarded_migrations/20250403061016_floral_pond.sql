/*
  # Fresh authentication setup

  1. Changes
    - Drop and recreate profiles table with proper structure
    - Set up RLS policies for secure profile management
    - Enable proper profile creation during signup

  2. Security
    - Enable RLS on profiles table
    - Allow profile creation during signup
    - Restrict profile access appropriately
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS profiles;

-- Recreate profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('interviewer', 'candidate')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow profile creation"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow reading all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow updating own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();