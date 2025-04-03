/*
  # Fresh Start - Complete Database Reset

  1. Changes
    - Drop all existing tables and types
    - Create fresh tables with proper structure
    - Set up RLS policies
    - Create necessary types and enums

  2. Security
    - Enable RLS on all tables
    - Set up proper policies for authentication
*/

-- Drop existing objects
DROP TABLE IF EXISTS interviews;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS profiles;
DROP TYPE IF EXISTS candidate_status;
DROP TYPE IF EXISTS interview_type;
DROP TYPE IF EXISTS interview_status;

-- Create custom types
CREATE TYPE candidate_status AS ENUM (
  'screening',
  'video_interview',
  'technical_assessment',
  'managerial_round',
  'completed',
  'rejected'
);

CREATE TYPE interview_type AS ENUM (
  'video',
  'technical',
  'managerial'
);

CREATE TYPE interview_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled'
);

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('interviewer', 'candidate')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create candidates table
CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  linkedin_url text,
  github_url text,
  resume_url text,
  skills text[] DEFAULT '{}',
  experience integer NOT NULL DEFAULT 0,
  status candidate_status NOT NULL DEFAULT 'screening',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interviews table
CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  type interview_type NOT NULL,
  status interview_status NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL,
  feedback text,
  score integer CHECK (score >= 0 AND score <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
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

-- Candidates table policies
CREATE POLICY "Allow authenticated users to read candidates"
ON candidates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert candidates"
ON candidates
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update candidates"
ON candidates
FOR UPDATE
TO authenticated
USING (true);

-- Interviews table policies
CREATE POLICY "Allow authenticated users to read interviews"
ON interviews
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert interviews"
ON interviews
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update interviews"
ON interviews
FOR UPDATE
TO authenticated
USING (true);

-- Create indexes
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();