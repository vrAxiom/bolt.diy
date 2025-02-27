import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/cloudflare';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { getUser } from '~/lib/auth/auth.server';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { Header } from '~/components/header/Header';
import { z } from 'zod';
import type { AuthConfig } from '~/types/auth';
import type { Env } from '~/types/env';

export const meta: MetaFunction = () => {
  return [{ title: 'Admin | Bolt' }];
};

// Validate domain input
const DomainSchema = z.string().min(3, 'Domain must be at least 3 characters');

// Define action data type
type ActionData = { error: string } | { errors: { domain: string } } | { success: boolean; message: string };

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as Env;

  // Check if user is authenticated and has admin privileges
  const user = await getUser(request, env);

  if (!user) {
    return redirect('/login?redirectTo=/admin');
  }

  /*
   * In a real application, you would check for admin role
   * For this example, we'll assume all authenticated users can access admin
   */

  // Get current auth config
  let authConfig: AuthConfig = { allowedDomains: [] };

  try {
    if (env && env.boltKV) {
      const config = (await env.boltKV.get('config', { type: 'json' as const })) as AuthConfig | null;

      if (config) {
        authConfig = config;
      }
    } else {
      console.log('boltKV is not available in the current environment');
    }
  } catch (error) {
    console.error('Error fetching auth config:', error);
  }

  return json({
    authConfig,
    user,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as Env;

  // Check if user is authenticated
  const user = await getUser(request, env);

  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const action = formData.get('_action')?.toString();

  // Get current config
  let authConfig: AuthConfig;

  try {
    if (env && env.boltKV) {
      const config = (await env.boltKV.get('config', { type: 'json' as const })) as AuthConfig | null;
      authConfig = config || { allowedDomains: [] };
    } else {
      console.log('boltKV is not available in the current environment');
      authConfig = { allowedDomains: [] };
    }
  } catch (error) {
    console.error('Error fetching auth config:', error);
    authConfig = { allowedDomains: [] };
  }

  if (action === 'add_domain') {
    const domain = formData.get('domain')?.toString().toLowerCase().trim();

    // Validate domain
    const result = DomainSchema.safeParse(domain);

    if (!result.success) {
      return json(
        {
          errors: { domain: result.error.flatten().formErrors[0] || 'Invalid domain' },
        },
        { status: 400 },
      );
    }

    // Check if domain already exists
    if (authConfig.allowedDomains.includes(domain!)) {
      return json(
        {
          errors: { domain: 'Domain already exists in whitelist' },
        },
        { status: 400 },
      );
    }

    // Add domain to whitelist
    authConfig.allowedDomains.push(domain!);

    // Update config in KV
    if (env && env.boltKV) {
      await env.boltKV.put('config', JSON.stringify(authConfig));

      return json({
        success: true,
        message: `Domain ${domain} added to whitelist`,
      });
    } else {
      console.log('boltKV is not available in the current environment');
      return json(
        {
          error: 'KV storage not available in this environment',
        },
        { status: 500 },
      );
    }
  }

  if (action === 'remove_domain') {
    const domain = formData.get('domain')?.toString().toLowerCase().trim();

    // Remove domain from whitelist
    authConfig.allowedDomains = authConfig.allowedDomains.filter((d) => d !== domain);

    // Update config in KV
    if (env && env.boltKV) {
      await env.boltKV.put('config', JSON.stringify(authConfig));

      return json({
        success: true,
        message: `Domain ${domain} removed from whitelist`,
      });
    } else {
      console.log('boltKV is not available in the current environment');
      return json(
        {
          error: 'KV storage not available in this environment',
        },
        { status: 500 },
      );
    }
  }

  if (action === 'toggle_auth_requirement') {
    const requireAuth = formData.get('requireAuth') === 'on';

    // Update auth requirement
    authConfig.requireAuth = requireAuth;

    // Update config in KV
    if (env && env.boltKV) {
      await env.boltKV.put('config', JSON.stringify(authConfig));

      return json({
        success: true,
        message: `Authentication requirement ${requireAuth ? 'enabled' : 'disabled'}`,
      });
    } else {
      console.log('boltKV is not available in the current environment');
      return json(
        {
          error: 'KV storage not available in this environment',
        },
        { status: 500 },
      );
    }
  }

  return json({ error: 'Invalid action' }, { status: 400 });
}

export default function Admin() {
  const { authConfig } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const domainRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (actionData && 'success' in actionData && actionData.success) {
      setSuccessMessage(actionData.message);

      // Clear success message after 3 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

      // Return cleanup function
      return () => {
        clearTimeout(timer);
      };
    }

    // Always return a function, even if it's empty
    return () => {
      // Cleanup function (intentionally empty)
    };
  }, [actionData]);

  return (
    <div className="flex flex-col h-full w-full dark:bg-bolt-elements-background-depth-1 bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />

      <div className="flex-1 flex flex-col items-center pt-8 px-4 overflow-auto">
        <div className="w-full max-w-4xl bg-bolt-elements-background-depth-2 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-bolt-elements-textPrimary mb-6">Admin Dashboard</h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">Authentication Settings</h2>

            <Form method="post" className="mb-6">
              <input type="hidden" name="_action" value="toggle_auth_requirement" />

              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="requireAuth"
                  name="requireAuth"
                  className="h-4 w-4 rounded border-bolt-elements-borderColor text-bolt-elements-accent focus:ring-bolt-elements-accent"
                  defaultChecked={authConfig.requireAuth}
                />
                <label htmlFor="requireAuth" className="text-bolt-elements-textPrimary">
                  Require authentication to use the application
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-bolt-elements-accent text-white rounded-md hover:bg-bolt-elements-accent/90 transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Setting'}
              </button>
            </Form>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4">Domain Whitelist</h2>
            <p className="text-bolt-elements-textSecondary mb-4">
              Only email addresses with these domains will be allowed to register. Leave empty to allow all domains.
            </p>

            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-md">
                {successMessage}
              </div>
            )}

            <Form method="post" className="mb-6">
              <input type="hidden" name="_action" value="add_domain" />

              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    ref={domainRef}
                    type="text"
                    name="domain"
                    placeholder="example.com"
                    className="w-full px-3 py-2 border border-bolt-elements-borderColor rounded-md shadow-sm bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary focus:outline-none focus:ring-bolt-elements-focus focus:border-bolt-elements-focus"
                  />
                  {actionData && 'errors' in actionData && actionData.errors?.domain && (
                    <div className="mt-1 text-sm text-red-500 dark:text-red-400">{actionData.errors.domain}</div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-bolt-elements-accent text-white rounded-md hover:bg-bolt-elements-accent/90 transition-colors"
                >
                  Add Domain
                </button>
              </div>
            </Form>

            {authConfig.allowedDomains.length > 0 ? (
              <div className="border border-bolt-elements-borderColor rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-bolt-elements-borderColor">
                  <thead className="bg-bolt-elements-background-depth-3">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wider"
                      >
                        Domain
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-bolt-elements-textSecondary uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-bolt-elements-background-depth-2 divide-y divide-bolt-elements-borderColor">
                    {authConfig.allowedDomains.map((domain) => (
                      <tr key={domain}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-bolt-elements-textPrimary">{domain}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <Form method="post">
                            <input type="hidden" name="_action" value="remove_domain" />
                            <input type="hidden" name="domain" value={domain} />
                            <button
                              type="submit"
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Remove
                            </button>
                          </Form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-bolt-elements-textSecondary border border-bolt-elements-borderColor rounded-md">
                No domains in whitelist. All email domains can register.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
