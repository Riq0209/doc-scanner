-- Create PDF History table
CREATE TABLE pdf_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create Scan History table
CREATE TABLE scan_history (
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

-- Create policies to allow users to access only their own data
-- (For now, we'll allow anonymous access, but you can add auth later)
CREATE POLICY "Allow anonymous access" ON pdf_history FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON scan_history FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX pdf_history_created_at_idx ON pdf_history(created_at DESC);
CREATE INDEX scan_history_created_at_idx ON scan_history(created_at DESC);
