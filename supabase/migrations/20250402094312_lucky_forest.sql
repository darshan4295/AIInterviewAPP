/*
  # Add Insert Policy for Profiles Table

  1. Changes
    - Add RLS policy to allow authenticated users to create their own profile
    - Policy ensures users can only create a profile with their own auth.uid()

  2. Security
    - Maintains RLS enabled on profiles table
    - Restricts profile creation to authenticated users
    - Ensures users can only create profiles with matching IDs
*/

-- Add policy for inserting profiles
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);