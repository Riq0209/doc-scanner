import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mwbbrilsskueodquxxin.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13YmJyaWxzc2t1ZW9kcXV4eGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTk1NjYsImV4cCI6MjA3MjQ5NTU2Nn0.Fl5abQYPbA-u992PfrZR1j8JgoHmu1HRiCYD1E1RSmg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface PDFHistory {
  id: string;
  title: string;
  pdf_url: string;
  page_count: number;
  thumbnail_url?: string;
  created_at: string;
  user_id?: string;
}

export interface ScanHistory {
  id: string;
  image_url: string;
  extracted_text: string;
  preview: string;
  created_at: string;
  user_id?: string;
}
