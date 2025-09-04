import { supabase } from './supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('pdf_history')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Supabase connection successful!');
    return { success: true, message: 'Database connected successfully!' };
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return { success: false, error: String(error) };
  }
};
