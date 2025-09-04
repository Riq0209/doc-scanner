-- Complete updated schema with proper authentication
-- This is the full schema if you want to recreate everything from scratch

-- Create PDF History table (unchanged)
CREATE TABLE IF NOT EXISTS pdf_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create Scan History table (unchanged)
CREATE TABLE IF NOT EXISTS scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  extracted_text TEXT,
  preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE pdf_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- Drop old insecure policies if they exist
DROP POLICY IF EXISTS "Allow anonymous access" ON pdf_history;
DROP POLICY IF EXISTS "Allow anonymous access" ON scan_history;

-- Create secure policies for authenticated users
-- PDF History policies
CREATE POLICY "Users can view their own PDF history" 
ON pdf_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own PDF history" 
ON pdf_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDF history" 
ON pdf_history FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDF history" 
ON pdf_history FOR DELETE 
USING (auth.uid() = user_id);

-- Scan History policies
CREATE POLICY "Users can view their own scan history" 
ON scan_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan history" 
ON scan_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan history" 
ON scan_history FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan history" 
ON scan_history FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS pdf_history_created_at_idx ON pdf_history(created_at DESC);
CREATE INDEX IF NOT EXISTS scan_history_created_at_idx ON scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS pdf_history_user_id_idx ON pdf_history(user_id);
CREATE INDEX IF NOT EXISTS scan_history_user_id_idx ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS pdf_history_user_created_idx ON pdf_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scan_history_user_created_idx ON scan_history(user_id, created_at DESC);
