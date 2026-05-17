import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { toast } from 'sonner';
import { logError, logInfo } from './errorLogging';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
}

// Create custom storage handler with error handling
const customStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
      toast.error('Failed to save authentication data');
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
    }
  }
};

// Initialize Supabase client with simplified configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  },
  db: {
    schema: 'public'
  },
  httpOptions: {
    timeout: 10000
  }
});

// Export helper functions
export const clearAuthData = () => {
  try {
    // Clear all auth-related storage
    customStorage.removeItem('sb-auth-token');
    customStorage.removeItem('supabase.auth.token');
    customStorage.removeItem('supabase.auth.refreshToken');
    customStorage.removeItem('supabase.auth.recovery');
    
    // Clear any other related storage
    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    console.warn('Error clearing auth data:', error);
    toast.error('Failed to clear authentication data');
  }
};

// Add health check function
export const checkSupabaseHealth = async (): Promise<boolean> => {
  try {
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      throw authError;
    }

    const { error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return false;
  }
};