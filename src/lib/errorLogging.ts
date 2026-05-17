import { supabase } from './supabase';

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, any>;
  userId?: string;
  url?: string;
  timestamp?: string;
  skipServerLog?: boolean;
}

/**
 * Log an error to console in development and to Supabase in production
 */
export async function logError(error: Error | string, context: Record<string, any> = {}): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  const timestamp = new Date().toISOString();
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const userId = context.userId || (await getCurrentUserId());

  // Always log to console
  console.error('Error:', errorMessage);
  console.error('Context:', context);
  if (errorStack) {
    console.error('Stack:', errorStack);
  }

  // Skip server logging if specified (useful during connection issues)
  if (context.skipServerLog) {
    return;
  }

  try {
    // Only log to Supabase if we have a valid user ID or if anonymous logging is allowed
    if (userId) {
      await supabase.from('debug_logs').insert({
        event_type: 'error',
        user_id: userId,
        details: {
          message: errorMessage,
          stack: errorStack,
          context,
          url,
          timestamp
        }
      });
    } else {
      // For anonymous errors, only log to console
      console.info('Skipping server error logging for anonymous user');
    }
  } catch (logError) {
    // If logging to Supabase fails, just log to console
    console.error('Failed to log error to Supabase:', logError);
  }
}

/**
 * Log an info event to console in development and to Supabase in production
 */
export async function logInfo(message: string, details: Record<string, any> = {}): Promise<void> {
  const timestamp = new Date().toISOString();
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const userId = details.userId || (await getCurrentUserId());

  // Always log to console
  console.info('Info:', message);
  console.info('Details:', details);

  // Skip server logging if specified (useful during connection issues)
  if (details.skipServerLog) {
    return;
  }

  try {
    // Only log to Supabase if we have a valid user ID
    if (userId) {
      await supabase.from('debug_logs').insert({
        event_type: 'info',
        user_id: userId,
        details: {
          message,
          ...details,
          url,
          timestamp
        }
      });
    }
  } catch (logError) {
    // If logging to Supabase fails, just log to console
    console.error('Failed to log info to Supabase:', logError);
  }
}

/**
 * Log a warning event to console in development and to Supabase in production
 */
export async function logWarning(message: string, details: Record<string, any> = {}): Promise<void> {
  const timestamp = new Date().toISOString();
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const userId = details.userId || (await getCurrentUserId());

  // Always log to console
  console.warn('Warning:', message);
  console.warn('Details:', details);

  // Skip server logging if specified (useful during connection issues)
  if (details.skipServerLog) {
    return;
  }

  try {
    // Only log to Supabase if we have a valid user ID
    if (userId) {
      await supabase.from('debug_logs').insert({
        event_type: 'warning',
        user_id: userId,
        details: {
          message,
          ...details,
          url,
          timestamp
        }
      });
    }
  } catch (logError) {
    // If logging to Supabase fails, just log to console
    console.error('Failed to log warning to Supabase:', logError);
  }
}

/**
 * Get the current user ID from Supabase auth
 */
async function getCurrentUserId(): Promise<string | undefined> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return undefined;
  }
}

/**
 * Create a wrapped version of a function that catches and logs errors
 */
export function withErrorLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: Record<string, any> = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      await logError(error as Error, {
        ...context,
        functionName: fn.name,
        arguments: args
      });
      throw error;
    }
  };
}