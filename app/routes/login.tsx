import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { createUserSession, getUser } from '~/lib/auth/auth.server';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { z } from 'zod';
import { zfd } from 'zod-form-data';
import mockKV from '~/lib/mocks/mockKV';
import type { Env } from '~/types/env';

export const meta: MetaFunction = () => {
  return [{ title: 'Login | Bolt' }];
};

// Validate login form data
const LoginSchema = zfd.formData({
  email: zfd.text(z.string().email('Invalid email address')),
  password: zfd.text(z.string().min(6, 'Password must be at least 6 characters')),
});

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as Env;
  const user = await getUser(request, env);
  
  // If user is already logged in, redirect to home
  if (user) {
    return redirect('/');
  }
  
  // Get the redirect URL from query params
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirectTo') || '/';
  
  return json({ redirectTo });
}

interface LoginErrors {
  email?: string[];
  password?: string[];
  _form?: string[];
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as Env | undefined;
  
  try {
    const formData = await request.formData();
    const redirectTo = formData.get('redirectTo')?.toString() || '/';
    
    // Validate form data
    const result = LoginSchema.safeParse(formData);
    if (!result.success) {
      return json<{ errors: LoginErrors }>({ errors: result.error.flatten().fieldErrors as unknown as LoginErrors }, { status: 400 });
    }
    
    const { email, password } = result.data;
    
    // Use mockKV if env or boltKV is not available
    const kvStore = (env && env.boltKV) || mockKV;
    
    if (!env || !env.boltKV) {
      console.warn('boltKV is not available in the current environment, using mockKV instead for login');
    }

    const userKey = `user:${email.toLowerCase()}`;
    const userData = await kvStore.get(userKey, { type: 'json' as any });
    
    if (!userData) {
      return json<{ errors: LoginErrors }>({ errors: { email: ['User not found'] } }, { status: 401 });
    }
    
    // Check password
    if (userData.password !== password) {
      return json<{ errors: LoginErrors }>({ errors: { password: ['Invalid password'] } }, { status: 401 });
    }
    
    // Create user session
    return createUserSession(userData.id, redirectTo);
  } catch (error: unknown) {
    console.error('Login error:', error);
    return json<{ errors: LoginErrors }>({ errors: { _form: ['An error occurred during login'] } }, { status: 500 });
  }
}

export default function Login() {
  const { redirectTo } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);
  
  return (
    <div className="flex flex-col h-full w-full dark:bg-bolt-elements-bg-depth-1">
      <BackgroundRays />
      <div className="flex justify-center items-center h-full">
        <div className="w-full max-w-md p-8 space-y-8 dark:bg-bolt-elements-bg-depth-2 rounded-lg shadow-lg">
          <div className="text-center">
            <Link to="/" className="inline-block">
              <img src="/logo-light-styled.png" alt="Bolt" className="h-12 mx-auto dark:hidden" />
              <img src="/logo-dark-styled.png" alt="Bolt" className="h-12 mx-auto hidden dark:block" />
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-bolt-elements-textPrimary">Sign in to your account</h2>
          </div>
          
          <Form method="post" className="mt-8 space-y-6">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            
            {actionData?.errors?._form ? (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-500 dark:text-red-400">
                <ul className="list-disc pl-5 space-y-1">
                  {actionData.errors._form.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-bolt-elements-textSecondary">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md shadow-sm placeholder-bolt-elements-textTertiary 
                    bg-bolt-elements-bg-depth-1 text-bolt-elements-textPrimary focus:outline-none focus:ring-bolt-elements-focus focus:border-bolt-elements-focus"
                  />
                  {actionData?.errors?.email ? (
                    <div className="pt-1 text-red-500 dark:text-red-400 text-sm">
                      {actionData.errors.email[0]}
                    </div>
                  ) : null}
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-bolt-elements-textSecondary">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md shadow-sm placeholder-bolt-elements-textTertiary 
                    bg-bolt-elements-bg-depth-1 text-bolt-elements-textPrimary focus:outline-none focus:ring-bolt-elements-focus focus:border-bolt-elements-focus"
                  />
                  {actionData?.errors?.password ? (
                    <div className="pt-1 text-red-500 dark:text-red-400 text-sm">
                      {actionData.errors.password[0]}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bolt-elements-accent hover:bg-bolt-elements-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-sm">
                <Link to="/register" className="font-medium text-bolt-elements-accent hover:text-bolt-elements-accent/90">
                  Don't have an account? Register
                </Link>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
