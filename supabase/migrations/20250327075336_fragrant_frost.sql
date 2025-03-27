/*
  # Initial Database Schema Setup

  1. New Tables
    - `candidates`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `linkedin_url` (text)
      - `github_url` (text)
      - `resume_url` (text)
      - `skills` (text array)
      - `experience` (integer)
      - `status` (enum)
      - Timestamps

    - `interviews`
      - `id` (uuid, primary key)
      - `candidate_id` (uuid, foreign key)
      - `type` (enum)
      - `status` (enum)
      - `scheduled_at` (timestamptz)
      - `feedback` (text)
      - `score` (integer)
      - Timestamps

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

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

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
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
CREATE TABLE IF NOT EXISTS interviews (
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
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Create policies for candidates table
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

-- Create policies for interviews table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON interviews(scheduled_at);