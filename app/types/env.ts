/**
 * Cloudflare environment types
 */

export interface Env {
  boltKV: KVNamespace;
  AUTH_USERS: KVNamespace;
}

/**
 * Public environment variables available on the client (required for proper functionality)
 *
 */

// VITE_APP_VERSION is injected during build time, see package.json

/** Production environment variables */

// Extend the Cloudflare context to include our environment
declare global {
  interface App {
    AppLoadContext: {
      env: Env;
    };
  }
}
