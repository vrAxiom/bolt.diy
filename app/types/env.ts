/**
 * Cloudflare environment types
 */

export interface Env {
  boltKV: KVNamespace;
  AUTH_USERS: KVNamespace;
}

// Extend the Cloudflare context to include our environment
declare global {
  namespace App {
    interface AppLoadContext {
      env: Env;
    }
  }
}
