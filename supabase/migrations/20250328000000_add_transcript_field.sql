/*
  # Add Transcript and Recording URL Fields to Interviews Table

  1. Changes
    - Add transcript field to store interview transcripts
    - Add recording_url field to store references to video recordings
    - Add ai_analysis field to store AI analysis of the interview
*/

-- Add new fields to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS recording_url text,
ADD COLUMN IF NOT EXISTS ai_analysis jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_interviews_type ON interviews(type);