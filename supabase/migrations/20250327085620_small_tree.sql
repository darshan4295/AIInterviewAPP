/*
  # Fix Row Level Security Policies

  1. Changes
    - Update RLS policies for candidates table to allow proper access
    - Add policies for authenticated users to read all candidates
    - Add policies for authenticated users to insert and update candidates

  2. Security
    - Maintain RLS enabled on candidates table
    - Grant appropriate access to authenticated users
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'candidates' 
    AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Allow authenticated users to read candidates" ON candidates;
    DROP POLICY IF EXISTS "Allow authenticated users to insert candidates" ON candidates;
    DROP POLICY IF EXISTS "Allow authenticated users to update candidates" ON candidates;
  END IF;
END $$;

-- Create new policies with proper access control
CREATE POLICY "Allow authenticated users to read candidates"
ON public.candidates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert candidates"
ON public.candidates
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update candidates"
ON public.candidates
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);