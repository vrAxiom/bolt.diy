import { useStore } from '@nanostores/react';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from '~/lib/stores/theme';
import { stripIndents } from '~/utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getUser } from '~/lib/auth/auth.server';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from '~/styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

import type { Env } from '~/types/env';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

// Add global styles to ensure no white gaps
const globalStylesCode = `
  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: var(--bolt-elements-bg-depth-1);
  }
  
  html.dark, body.dark {
    background-color: var(--bolt-elements-bg-depth-1);
  }
`;

const inlineThemeCode = stripIndents`
  // Always set dark theme
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.classList.add('dark');
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
    <style dangerouslySetInnerHTML={{ __html: globalStylesCode }} />
  </>
));

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as Env;
  const user = await getUser(request, env);

  return json({
    user,
    isAuthenticated: !!user,
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', 'dark');

    // Force dark theme to match the design
    if (theme !== 'dark') {
      themeStore.set('dark');
    }
  }, [theme]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen h-full bg-bolt-elements-bg-depth-1 dark:bg-bolt-elements-bg-depth-1 text-bolt-elements-textPrimary">
        {children}
      </div>
      <ScrollRestoration />
      <Scripts />
    </DndProvider>
  );
}

// Document component to provide consistent theming
export function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full" data-theme="dark">
      <Head />
      <body className="dark:bg-bolt-elements-bg-depth-1 bg-bolt-elements-bg-depth-1 dark:text-bolt-elements-textPrimary min-h-screen h-full m-0 p-0">
        {children}
      </body>
    </html>
  );
}

export default function App() {
  const theme = useStore(themeStore);
  const data = useLoaderData<typeof loader>();
  const { user, isAuthenticated } = data;

  useEffect(() => {
    // Initialize mock data in development environment
    if (import.meta.env.DEV) {
      // Dynamically import to avoid issues in production
      import('./lib/mocks/setupMockData')
        .then(({ setupMockData }) => {
          setupMockData();
          console.log('🔧 Development environment: Mock KV initialized');
          console.log('👤 Test user: test@example.com / password123');
        })
        .catch((err) => console.error('Failed to setup mock data:', err));
    }

    // Set user in store if authenticated
    if (isAuthenticated && user) {
      /*
       * Removed unused import
       * userStore.set({
       *   user,
       *   isAuthenticated: true,
       * });
       */
    }
  }, [theme, isAuthenticated, user]);

  return (
    <Document>
      <Layout>
        <Outlet />
      </Layout>
    </Document>
  );
}
