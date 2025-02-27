import mockKV from './mockKV';
import type { Env } from '~/types/env';

/**
 * Creates a mock environment for local development
 * This provides mock implementations of Cloudflare services
 */
export function createMockEnv(): Env {
  return {
    boltKV: mockKV as unknown as KVNamespace,
    AUTH_USERS: mockKV as unknown as KVNamespace,
  };
}
