import { supabase } from '../lib/supabase';
import { logError, logInfo } from '../lib/errorLogging';

interface ConnectionTestResult {
  success: boolean;
  details: {
    timestamp: string;
    tests: {
      ping: {
        success: boolean;
        latency?: number;
        error?: string;
      };
      session: {
        success: boolean;
        hasSession: boolean;
        error: string | null;
      };
      schema?: {
        success: boolean;
        data?: any;
        error?: string;
      };
    };
    environment: {
      url: string;
      hasAnonKey: boolean;
      nodeEnv: string;
    };
  };
}

/**
 * Tests the connection to Supabase
 * @returns A promise that resolves to a ConnectionTestResult
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  try {
    const startTime = Date.now();
    
    // Test 1: Basic ping test
    let pingSuccess = false;
    let pingError = '';
    let pingLatency = 0;
    
    try {
      const pingStartTime = Date.now();
      // Simple test query
      let { error: pingErrorResponse } = await supabase.from('profiles').select('id').limit(1);
      
      if (pingErrorResponse) {
        console.error('Connection test failed:', pingErrorResponse);
        pingSuccess = false;
        pingError = pingErrorResponse.message;
      } else {
        pingSuccess = true;
        pingLatency = Date.now() - pingStartTime;
      }
    } catch (err) {
      pingSuccess = false;
      pingError = err instanceof Error ? err.message : 'Unknown error';
      console.error('Ping test error:', err);
    }
    
    // Test 2: Session check
    let sessionTest = { success: false, hasSession: false, error: null };
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      sessionTest = {
        success: !sessionError,
        hasSession: !!sessionData.session,
        error: sessionError ? sessionError.message : null
      };
      
      if (sessionError) {
        console.error('Session check failed:', sessionError);
      } else {
        console.log('Session check result:', sessionData);
      }
    } catch (sessionErr) {
      console.error('Session check exception:', sessionErr);
      sessionTest.error = sessionErr instanceof Error ? sessionErr.message : 'Unknown error';
    }

    // Test 3: Schema check
    let schemaTest = { success: false, data: null, error: null };
    try {
      const { data, error } = await supabase.rpc('debug_get_schema_info');
      
      schemaTest = {
        success: !error,
        data: data,
        error: error ? error.message : null
      };
      
      if (error) {
        console.error('Schema check failed:', error);
      }
    } catch (schemaErr) {
      console.error('Schema check exception:', schemaErr);
      schemaTest.error = schemaErr instanceof Error ? schemaErr.message : 'Unknown error';
    }

    // Calculate latency
    const latency = Date.now() - startTime;

    // Get environment info
    const envInfo = {
      url: supabase.supabaseUrl,
      hasAnonKey: !!supabase.supabaseKey,
      nodeEnv: import.meta.env.MODE || 'unknown'
    };

    // Overall test results
    const success = pingSuccess && sessionTest.success;
    
    const details = {
      timestamp: new Date().toISOString(),
      tests: {
        ping: {
          success: pingSuccess,
          latency: pingLatency,
          error: pingError
        },
        session: sessionTest,
        schema: schemaTest
      },
      environment: envInfo
    };
    
    if (!success) {
      logError(new Error('Supabase connection test failed'), {
        action: 'testSupabaseConnection',
        details,
        skipServerLog: true
      });
    } else {
      logInfo('Supabase connection test passed', {
        action: 'testSupabaseConnection',
        details,
        skipServerLog: true
      });
    }

    return {
      success,
      details
    };
  } catch (error) {
    console.error('Error in testSupabaseConnection:', error);
    logError(error as Error, { action: 'testSupabaseConnection', skipServerLog: true });
    return {
      success: false,
      details: {
        timestamp: new Date().toISOString(),
        tests: {
          ping: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          session: {
            success: false,
            hasSession: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        environment: {
          url: supabase.supabaseUrl,
          hasAnonKey: !!supabase.supabaseKey,
          nodeEnv: import.meta.env.MODE || 'unknown'
        }
      }
    };
  }
}

/**
 * Attempts to fix Supabase connection issues
 * @returns A promise that resolves to a boolean indicating success
 */
export async function fixSupabaseConnection(): Promise<boolean> {
  try {
    // Clear any existing auth state
    await supabase.auth.signOut();
    
    // Clear local storage
    localStorage.clear();
    
    // Clear session storage
    sessionStorage.clear();
    
    // Attempt to re-establish connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      logError(error, { action: 'fixSupabaseConnection', skipServerLog: true });
      return false;
    }
    
    logInfo('Supabase connection fix applied', {
      hasSession: !!data.session,
      skipServerLog: true
    });
    
    return true;
  } catch (error) {
    logError(error as Error, { action: 'fixSupabaseConnection', skipServerLog: true });
    return false;
  }
}

/**
 * Tests login with provided credentials
 * @param email Email to test
 * @param password Password to test
 * @returns A promise that resolves to an object with login test results
 */
export async function testLogin(email: string, password: string) {
  try {
    // First sign out to ensure clean state
    await supabase.auth.signOut();
    
    console.log('Testing login with:', { email });
    logInfo('Attempting login', { email, skipServerLog: true });
    
    // Try to sign in with test account
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Login test error details:', error);
      logError(error, { 
        action: 'testLogin', 
        email,
        errorCode: error.code,
        errorName: error.name,
        errorMessage: error.message,
        errorStatus: error.status,
        skipServerLog: true
      });
      
      return {
        success: false,
        error: error.message,
        errorDetails: {
          code: error.code,
          name: error.name,
          status: error.status
        }
      };
    }
    
    console.log('Login test success details:', data);
    
    // Get user profile
    let profile = null;
    let profileError = null;
    
    try {
      const { data: profileData, error: fetchProfileError } = await supabase
        .from('profiles')
        .select('id, role, name, class_id, school_id')
        .eq('id', data.user.id)
        .single();
        
      if (fetchProfileError) {
        console.error('Error fetching profile during test login:', fetchProfileError);
        profileError = fetchProfileError.message;
      } else {
        profile = profileData;
      }
    } catch (profileErr) {
      console.error('Exception fetching profile during test login:', profileErr);
      profileError = profileErr instanceof Error ? profileErr.message : 'Unknown error fetching profile';
    }
    
    logInfo('Login test successful', {
      userId: data.user.id,
      email: data.user.email,
      hasSession: !!data.session,
      hasProfile: !!profile,
      skipServerLog: true
    });
    
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        profile,
        profileError
      },
      session: {
        exists: !!data.session,
        expiresAt: data.session?.expires_at
      }
    };
  } catch (error) {
    console.error('Test login exception:', error);
    logError(error as Error, { 
      action: 'testLogin', 
      email,
      exceptionDetails: error instanceof Error ? error.stack : 'No stack trace available',
      skipServerLog: true
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: 'exception'
    };
  }
}

/**
 * Checks if RLS is enabled on a table
 * @param tableName The name of the table to check
 * @returns A promise that resolves to an object with RLS status
 */
export async function checkRlsStatus(tableName: string) {
  try {
    // Try to get RLS status via RPC function
    const { data, error } = await supabase.rpc('check_rls_status', { table_name: tableName });
    
    if (error) {
      console.error('Error checking RLS status via RPC:', error);
      
      // Fallback: Try a direct query to test access
      const { data: testData, error: testError } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      return { 
        success: !testError, 
        enabled: testError?.code === '42501', // Permission denied error indicates RLS is enabled
        canAccess: !testError,
        error: error.message
      };
    }
    
    return { 
      success: true, 
      enabled: data,
      canAccess: true
    };
  } catch (error) {
    console.error('Exception checking RLS status:', error);
    logError(error as Error, { action: 'checkRlsStatus', tableName, skipServerLog: true });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      canAccess: false
    };
  }
}

/**
 * Queries the database schema
 * @returns A promise that resolves to an object with schema information
 */
export async function queryDatabaseSchema() {
  try {
    // Try to get schema info via RPC function
    const { data, error } = await supabase.rpc('debug_get_schema_info');
    
    if (error) {
      console.error('Error querying schema via RPC:', error);
      
      // Fallback: Try a basic query
      try {
        const { data: basicData, error: basicError } = await supabase
          .from('profiles')
          .select('id, role')
          .limit(1);
          
        if (basicError) {
          return { 
            success: false, 
            error: `Schema query failed: ${error.message}, basic query also failed: ${basicError.message}` 
          };
        }
        
        return {
          success: true,
          data: { 
            basic: true,
            profiles: basicData
          }
        };
      } catch (basicError) {
        return { 
          success: false, 
          error: `All schema queries failed: ${error.message}` 
        };
      }
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Exception querying database schema:', error);
    logError(error as Error, { action: 'queryDatabaseSchema', skipServerLog: true });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Decodes a JWT token
 * @param token The JWT token to decode
 * @returns The decoded token payload
 */
export function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Simulates a database error
 * @returns A promise that resolves to an error
 */
export async function simulateDatabaseError() {
  try {
    // Attempt to query a non-existent table
    const { error } = await supabase
      .from('non_existent_table')
      .select('*');
    
    return {
      success: false,
      error: error?.message || 'Simulated database error'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Simulated database error'
    };
  }
}

/**
 * Simulates a session expiration
 * @returns A promise that resolves to a boolean indicating success
 */
export async function simulateSessionExpiration() {
  try {
    // Clear the session from local storage
    localStorage.removeItem('supabase.auth.token');
    
    // Sign out to invalidate the session
    await supabase.auth.signOut();
    
    return true;
  } catch (error) {
    console.error('Error simulating session expiration:', error);
    return false;
  }
}