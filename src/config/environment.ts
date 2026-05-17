// Environment configuration
export const isDevelopment = import.meta.env.MODE === 'development';
export const isProduction = import.meta.env.MODE === 'production';
export const isStaging = import.meta.env.MODE === 'staging';

// Feature flags
export const ENABLE_DEBUG_FEATURES = false;

// User management settings
export const USER_MANAGEMENT = {
  DEFAULT_INACTIVITY_DAYS: 30,
  MAX_INACTIVITY_DAYS: 365,
  DEFAULT_EXCLUDED_ROLES: ['admin', 'teacher'],
  DEFAULT_DRY_RUN: true
};