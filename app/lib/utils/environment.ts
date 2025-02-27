/**
 * Environment utility functions
 */

/**
 * Check if the current environment is development
 */
export function isDevelopment(): boolean {
  return typeof window !== 'undefined' && import.meta.env.DEV === true;
}

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return typeof window !== 'undefined' && import.meta.env.PROD === true;
}

/**
 * Check if the code is running on the server
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}
