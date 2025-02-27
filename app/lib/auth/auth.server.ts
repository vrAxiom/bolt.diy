import { createCookieSessionStorage, redirect } from '@remix-run/cloudflare';
import type { User } from '~/types/auth';
import type { Env } from '~/types/env';

// Import mock KV for development when needed
import mockKV from '~/lib/mocks/mockKV';

/**
 * Authentication utilities for server-side operations
 */

// Session storage configuration
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'bolt_auth_session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: ['s3cr3t'], // Replace with environment variable in production
    secure: process.env.NODE_ENV === 'production',
  },
});

// Get the user session
export async function getUserSession(request: Request) {
  return sessionStorage.getSession(request.headers.get('Cookie'));
}

// Get the logged in user if exists
export async function getUser(request: Request, env: Env | undefined): Promise<User | null> {
  const session = await getUserSession(request);
  const userId = session.get('userId');

  if (!userId) {
    return null;
  }

  try {
    // Use mockKV if env or boltKV is not available
    const kvStore = (env && env.boltKV) || mockKV;

    // Log that we're using mock KV if boltKV is not available
    if (!env || !env.boltKV) {
      console.warn('boltKV is not available in the current environment, using mockKV instead');
    }

    const userData = await kvStore.get(userId, { type: 'json' as any });

    if (!userData) {
      return null;
    }

    // Convert userData to User type with proper type checking
    return userData as unknown as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Check if the email domain is in the whitelist
export function isEmailDomainAllowed(email: string, allowedDomains: string[]): boolean {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    return false;
  }

  return allowedDomains.some(
    (allowedDomain) => domain === allowedDomain.toLowerCase() || domain.endsWith(`.${allowedDomain.toLowerCase()}`),
  );
}

// Create a new user session
export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set('userId', userId);

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }),
    },
  });
}

// Add a test user to the mock KV for development
export async function addTestUser(env: Env | undefined) {
  // Use mockKV if env or boltKV is not available
  const kvStore = (env && env.boltKV) || mockKV;

  if (!env || !env.boltKV) {
    console.log('Adding test user to mockKV for development');

    const testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    await kvStore.put(`user:${testUser.email}`, JSON.stringify(testUser));
    console.log('✅ Test user added: test@example.com / password123');
  }
}

// Log out user and destroy session
export async function logout(request: Request) {
  const session = await getUserSession(request);

  return redirect('/', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}

// Require user authentication
export async function requireUser(
  request: Request,
  env: Env | undefined,
  redirectTo: string = new URL(request.url).pathname,
) {
  const user = await getUser(request, env);

  if (!user) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return user;
}
