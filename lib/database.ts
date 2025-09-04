import type { PDFHistory, ScanHistory } from './supabase';
import { supabase } from './supabase';

export class DatabaseService {
  // Helper function to get current user
  private static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Helper function to check if user is authenticated
  private static async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  }

  // PDF History Functions
  static async savePDFToHistory(pdfData: Omit<PDFHistory, 'id' | 'created_at' | 'user_id'>) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        // For guest users, we might want to save to local storage instead
        console.log('Guest mode: PDF not saved to cloud');
        return { success: false, error: 'Not authenticated' };
      }

      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('pdf_history')
        .insert({ ...pdfData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving PDF to history:', error);
      return { success: false, error };
    }
  }

  static async getPDFHistory(limit = 50) {
    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        return { success: true, data: [] }; // Return empty array for guest users
      }

      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('pdf_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting PDF history:', error);
      return { success: false, error };
    }
  }

  static async deletePDF(id: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('pdf_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting PDF:', error);
      return { success: false, error };
    }
  }

  // Scan History Functions
  static async saveScanToHistory(scanData: Omit<ScanHistory, 'id' | 'created_at' | 'user_id'>) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('scan_history')
        .insert({ ...scanData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving scan to history:', error);
      return { success: false, error };
    }
  }

  static async getScanHistory(limit = 50) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting scan history:', error);
      return { success: false, error };
    }
  }

  static async deleteScan(id: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('scan_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting scan:', error);
      return { success: false, error };
    }
  }

  // Combined History
  static async getAllHistory(limit = 50) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const [pdfResult, scanResult] = await Promise.all([
        this.getPDFHistory(limit),
        this.getScanHistory(limit)
      ]);

      if (!pdfResult.success || !scanResult.success) {
        throw new Error('Failed to fetch history');
      }

      // Combine and sort by date
      const combinedHistory = [
        ...(pdfResult.data || []).map(item => ({ ...item, type: 'pdf' as const })),
        ...(scanResult.data || []).map(item => ({ ...item, type: 'scan' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { success: true, data: combinedHistory.slice(0, limit) };
    } catch (error) {
      console.error('Error getting all history:', error);
      return { success: false, error };
    }
  }

  // Clear all history
  static async clearAllHistory() {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error: pdfError } = await supabase
        .from('pdf_history')
        .delete()
        .eq('user_id', user.id);

      const { error: scanError } = await supabase
        .from('scan_history')
        .delete()
        .eq('user_id', user.id);

      if (pdfError || scanError) throw pdfError || scanError;
      return { success: true };
    } catch (error) {
      console.error('Error clearing history:', error);
      return { success: false, error };
    }
  }
}
