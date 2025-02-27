import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { createUserSession, getUser, isEmailDomainAllowed } from '~/lib/auth/auth.server';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { z } from 'zod';
import type { AuthConfig } from '~/types/auth';
import type { Env } from '~/types/env';

export const meta: MetaFunction = () => {
  return [{ title: 'Register | Bolt' }];
};

// Validate registration form data
const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

// Define action data type
type ActionData = 
  | { errors: { 
      email?: string[]; 
      password?: string[]; 
      firstName?: string[]; 
      lastName?: string[];
      _form?: string[];
    } 
  };

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
  
  // Get allowed domains from KV
  let allowedDomains: string[] = [];
  try {
    if (env && env.boltKV) {
      const authConfig = await env.boltKV.get('config', { type: 'json' as const }) as AuthConfig | null;
      if (authConfig) {
        allowedDomains = authConfig.allowedDomains;
      }
    } else {
      console.log('boltKV is not available in the current environment, using default empty allowed domains');
    }
  } catch (error) {
    console.error('Error fetching allowed domains:', error);
  }
  
  return json({ redirectTo, allowedDomains });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as Env;
  const formData = await request.formData();
  
  const email = formData.get('email')?.toString().toLowerCase();
  const password = formData.get('password')?.toString();
  const firstName = formData.get('firstName')?.toString();
  const lastName = formData.get('lastName')?.toString();
  const redirectTo = formData.get('redirectTo')?.toString() || '/';
  
  // Validate form data
  const result = RegisterSchema.safeParse({ email, password, firstName, lastName });
  if (!result.success) {
    return json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
  }
  
  try {
    // Check if email domain is allowed
    if (env && env.boltKV) {
      const authConfig = await env.boltKV.get('config', { type: 'json' as const }) as AuthConfig | null;
      const allowedDomains = authConfig?.allowedDomains || [];
      
      if (allowedDomains.length > 0 && !isEmailDomainAllowed(email!, allowedDomains)) {
        return json({ 
          errors: { 
            email: [`Registration is only allowed for the following domains: ${allowedDomains.join(', ')}`] 
          } 
        }, { status: 403 });
      }
    }
    
    // Check if user already exists
    const userKey = `user:${email}`;
    const existingUser = await env.AUTH_USERS.get(userKey);
    
    if (existingUser) {
      return json({ errors: { email: ['User with this email already exists'] } }, { status: 400 });
    }
    
    // Create new user
    // In a real app, you'd use a proper password hashing library
    const userData = {
      id: userKey,
      email,
      firstName,
      lastName,
      passwordHash: password, // This should be properly hashed in production
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await env.AUTH_USERS.put(userKey, JSON.stringify(userData));
    
    // Create user session and redirect
    return createUserSession(userKey, redirectTo);
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return json({ errors: { _form: ['An error occurred during registration'] } }, { status: 500 });
  }
}

export default function Register() {
  const { redirectTo, allowedDomains } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (actionData?.errors?.firstName && actionData.errors.firstName.length > 0) {
      firstNameRef.current?.focus();
    } else if (actionData?.errors?.lastName && actionData.errors.lastName.length > 0) {
      lastNameRef.current?.focus();
    } else if (actionData?.errors?.email && actionData.errors.email.length > 0) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password && actionData.errors.password.length > 0) {
      passwordRef.current?.focus();
    }
  }, [actionData]);
  
  const hasFirstNameError = actionData?.errors?.firstName && actionData.errors.firstName.length > 0;
  const hasLastNameError = actionData?.errors?.lastName && actionData.errors.lastName.length > 0;
  const hasEmailError = actionData?.errors?.email && actionData.errors.email.length > 0;
  const hasPasswordError = actionData?.errors?.password && actionData.errors.password.length > 0;
  const hasFormError = actionData?.errors?._form && actionData.errors._form.length > 0;
  
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
            <h2 className="mt-6 text-3xl font-bold text-bolt-elements-textPrimary">Create your account</h2>
            {allowedDomains.length > 0 && (
              <p className="mt-2 text-sm text-bolt-elements-textSecondary">
                Registration is only allowed for the following domains: {allowedDomains.join(', ')}
              </p>
            )}
          </div>
          
          <Form method="post" className="mt-8 space-y-6">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            
            {hasFormError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-md">
                {actionData?.errors?._form?.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}
            
            <div className="rounded-md shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-bolt-elements-textSecondary">
                    First name
                  </label>
                  <div className="mt-1">
                    <input
                      ref={firstNameRef}
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md shadow-sm placeholder-bolt-elements-textTertiary 
                      bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary focus:outline-none focus:ring-bolt-elements-focus focus:border-bolt-elements-focus dark:bg-bolt-elements-bg-depth-1 dark:text-bolt-elements-textPrimary"
                    />
                    {hasFirstNameError && (
                      <div className="pt-1 text-red-500 dark:text-red-400 text-sm">
                        {actionData?.errors?.firstName?.[0]}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-bolt-elements-textSecondary">
                    Last name
                  </label>
                  <div className="mt-1">
                    <input
                      ref={lastNameRef}
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md shadow-sm placeholder-bolt-elements-textTertiary 
                      bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary focus:outline-none focus:ring-bolt-elements-focus focus:border-bolt-elements-focus dark:bg-bolt-elements-bg-depth-1 dark:text-bolt-elements-textPrimary"
                    />
                    {hasLastNameError && (
                      <div className="pt-1 text-red-500 dark:text-red-400 text-sm">
                        {actionData?.errors?.lastName?.[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
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
                    bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary focus:outline-none focus:ring-bolt-elements-focus focus:border-bolt-elements-focus dark:bg-bolt-elements-bg-depth-1 dark:text-bolt-elements-textPrimary"
                  />
                  {hasEmailError && (
                    <div className="pt-1 text-red-500 dark:text-red-400 text-sm">
                      {actionData?.errors?.email?.[0]}
                    </div>
                  )}
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
                    autoComplete="new-password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md shadow-sm placeholder-bolt-elements-textTertiary 
                    bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary focus:outline-none focus:ring-bolt-elements-focus focus:border-bolt-elements-focus dark:bg-bolt-elements-bg-depth-1 dark:text-bolt-elements-textPrimary"
                  />
                  {hasPasswordError && (
                    <div className="pt-1 text-red-500 dark:text-red-400 text-sm">
                      {actionData?.errors?.password?.[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-bolt-elements-accent hover:bg-bolt-elements-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bolt-elements-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-sm">
                <Link to="/login" className="font-medium text-bolt-elements-accent hover:text-bolt-elements-accent/90">
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
