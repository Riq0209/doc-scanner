-- First, drop the existing overly permissive policies
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

-- Optional: Add indexes on user_id for better performance
CREATE INDEX IF NOT EXISTS pdf_history_user_id_idx ON pdf_history(user_id);
CREATE INDEX IF NOT EXISTS scan_history_user_id_idx ON scan_history(user_id);

-- Optional: Add composite indexes for user-specific queries
CREATE INDEX IF NOT EXISTS pdf_history_user_created_idx ON pdf_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scan_history_user_created_idx ON scan_history(user_id, created_at DESC);
