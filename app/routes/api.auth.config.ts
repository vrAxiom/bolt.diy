import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { z } from 'zod';
import { getUser } from '~/lib/auth/auth.server';
import type { AuthConfig } from '~/types/auth';
import type { Env } from '~/types/env';

// Validate auth config
const authConfigSchema = z.object({
  allowedDomains: z.array(z.string()).min(1, 'At least one domain must be specified'),
});

export async function loader({ context, request }: ActionFunctionArgs) {
  const env = context.env as Env;

  // Only allow authenticated users to view config
  const user = await getUser(request, env);

  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (env && env.boltKV) {
      const config = (await env.boltKV.get('config', { type: 'json' as any })) as AuthConfig | null;
      return json({ config: config || { allowedDomains: [] } });
    } else {
      console.log('boltKV is not available in the current environment');
      return json({ config: { allowedDomains: [] } });
    }
  } catch (error) {
    console.error('Error fetching auth config:', error);
    return json({ error: 'Failed to fetch auth configuration' }, { status: 500 });
  }
}

export async function action({ context, request }: ActionFunctionArgs) {
  const env = context.env as Env;

  // Only allow authenticated users to update config
  const user = await getUser(request, env);

  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow POST method
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const data = await request.json();

    // Validate config data
    const result = authConfigSchema.safeParse(data);

    if (!result.success) {
      return json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
    }

    // Update config in KV
    if (env && env.boltKV) {
      await env.boltKV.put('config', JSON.stringify(result.data));
      return json({ success: true, config: result.data });
    } else {
      console.log('boltKV is not available in the current environment');
      return json({ error: 'KV storage not available in this environment' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating auth config:', error);
    return json({ error: 'Failed to update auth configuration' }, { status: 500 });
  }
}
