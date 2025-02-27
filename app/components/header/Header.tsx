import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { userStore } from '~/lib/stores/user';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { Link } from '@remix-run/react';

export function Header() {
  const chat = useStore(chatStore);
  const { isAuthenticated } = useStore(userStore);

  return (
    <header
      className={classNames('flex items-center p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-3 z-logo">
        <a href="/" className="text-2xl font-semibold flex items-center hover:opacity-80 transition-opacity">
          <img src="/logo-light-styled.png" alt="logo" className="w-[120px] inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="logo" className="w-[120px] inline-block hidden dark:block" />
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {chat.started && (
          <span className="px-4 py-1 truncate text-center text-bolt-elements-textPrimary bg-bolt-elements-background-depth-2 rounded-full">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <Link
            to="/admin"
            className="text-bolt-elements-textPrimary hover:text-bolt-elements-accent transition-colors"
            title="Admin"
          >
            <div className="i-ph:gear-six text-xl" />
          </Link>
        )}

        {chat.started && (
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        )}
      </div>
    </header>
  );
}
