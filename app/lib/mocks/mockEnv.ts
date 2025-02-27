import mockKV from './mockKV';
import type { Env } from '~/types/env';

/**
 * Creates a mock environment for local development 
 * This provides mock implementations of Cloudflare services
 */
export function createMockEnv(): Env {
  return {
    boltKV: mockKV,
    // Add other environment variables as needed
    ENVIRONMENT: 'development',
    NODE_ENV: 'development'
  };
}
