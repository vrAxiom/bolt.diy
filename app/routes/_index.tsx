import { json, redirect, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { getUser } from '~/lib/auth/auth.server';
import type { Env } from '~/types/env';
import mockKV from '~/lib/mocks/mockKV';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const env = context.env as Env | undefined;
  
  // Use mockKV if env or boltKV is not available
  const kvStore = (env && env.boltKV) || mockKV;
  
  if (!env || !env.boltKV) {
    console.warn('boltKV is not available in the current environment, using mockKV instead');
  }
  
  // Check if authentication is required
  try {
    // Get auth config from KV store
    const authConfig = await kvStore.get('config', { type: 'json' as any }) as { requireAuth?: boolean } | null;
    const requireAuth = authConfig?.requireAuth === true;
    
    if (requireAuth) {
      // Check if user is authenticated
      const user = await getUser(request, env);
      if (!user) {
        // Redirect to login if authentication is required but user is not authenticated
        return redirect('/login');
      }
    }
  } catch (error) {
    console.error('Error checking authentication requirements:', error);
    // Continue if there's an error checking auth requirements
  }
  
  return json({});
};

/**
 * Landing page component for Bolt
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full dark:bg-bolt-elements-bg-depth-1 bg-bolt-elements-bg-depth-1 relative">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
