import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { ControlPanel } from '~/components/@settings/core/ControlPanel';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory } from '~/lib/persistence';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { userStore } from '~/lib/stores/user';
import { Form } from '@remix-run/react';

const menuVariants = {
  closed: {
    opacity: 1,
    left: '-300px',
    width: '0px',
    transition: {
      duration: 0.3,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    left: 0,
    width: '340px',
    transition: {
      duration: 0.3,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

type DialogContent = { type: 'delete'; item: ChatHistoryItem } | null;

function CurrentDateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-bolt-elements-textSecondary border-b border-bolt-elements-borderColor">
      <div className="h-4 w-4 i-ph:clock opacity-80" />
      <div className="flex gap-2">
        <span>{dateTime.toLocaleDateString()}</span>
        <span>{dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

export const Menu = () => {
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [open, setOpen] = useState(true);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const profile = useStore(profileStore);
  const { user, isAuthenticated } = useStore(userStore);

  const { searchQuery, filteredItems, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearchChange(e);
    },
    [handleSearchChange],
  );

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list) => list.filter((item) => item.urlId && item.description))
        .then(setList)
        .catch((error) => toast.error(error.message));
    }
  }, []);

  const deleteItem = useCallback((event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();

    if (db) {
      deleteById(db, item.id)
        .then(() => {
          loadEntries();

          if (chatId.get() === item.id) {
            // hard page navigation to clear the stores
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete conversation');
          logger.error(error);
        });
    }
  }, []);

  const closeDialog = () => {
    setDialogContent(null);
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open]);

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const handleDeleteClick = (event: React.UIEvent, item: ChatHistoryItem) => {
    event.preventDefault();
    setDialogContent({ type: 'delete', item });
  };

  const handleDuplicate = async (id: string) => {
    await duplicateCurrentChat(id);
    loadEntries(); // Reload the list after duplication
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    setOpen(false);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  return (
    <>
      <motion.div
        ref={menuRef}
        initial="closed"
        animate={open ? 'open' : 'closed'}
        variants={menuVariants}
        className="fixed flex flex-col h-full z-10 bg-bolt-elements-background-depth-2 border-r border-bolt-elements-borderColor overflow-hidden"
      >
        <div className="h-[var(--header-height)] flex justify-between items-center px-3 pt-5 pb-5 border-b border-bolt-elements-borderColor">
          <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
            <div
              onClick={toggleSidebar}
              className={`i-ph:sidebar-simple-duotone text-xl text-gray-200 hover:text-bolt-elements-accent transition-colors ${open ? 'rotate-0' : 'rotate-180'}`}
              title={open ? "Collapse sidebar" : "Expand sidebar"}
            />
            {open && (
              <span className="text-lg font-medium text-bolt-elements-textPrimary">
                Menu
              </span>
            )}
          </div>
          {open && (
            <div className="flex items-center">
              <ThemeSwitch />
              <SettingsButton onClick={() => setIsSettingsOpen(!isSettingsOpen)} />
            </div>
          )}
        </div>

        {open && isAuthenticated && user ? (
          <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-bolt-elements-accent flex items-center justify-center text-white font-medium">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div>
                <div className="font-medium text-bolt-elements-textPrimary">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-bolt-elements-textSecondary">{user.email}</div>
              </div>
            </div>
            <Form action="/logout" method="post">
              <button 
                type="submit"
                className="p-1.5 hover:bg-bolt-elements-background-depth-3 rounded text-gray-300"
                title="Logout"
              >
                <div className="i-ph:sign-out text-lg" />
              </button>
            </Form>
          </div>
        ) : open ? (
          <div className="flex items-center justify-between p-4 border-b border-bolt-elements-borderColor">
            <div className="text-bolt-elements-textSecondary">Guest User</div>
            <a 
              href="/login" 
              className="px-3 py-1.5 bg-bolt-elements-accent text-white rounded-md text-sm hover:bg-bolt-elements-accent/90"
            >
              Sign In
            </a>
          </div>
        ) : null}

        {open && (
          <>
            <div className="p-4 pb-2 border-b border-bolt-elements-borderColor">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search chats..."
                  autoComplete="off"
                  className="block w-full py-2 pl-9 pr-3 bg-bolt-elements-background-depth-1 rounded border border-bolt-elements-borderColor focus:border-bolt-elements-focus focus:ring-bolt-elements-focus focus:outline-none text-bolt-elements-textPrimary placeholder:text-bolt-elements-textSecondary transition duration-150 ease-in-out leading-normal text-sm"
                  onChange={handleSearchInputChange}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="i-ph:magnifying-glass text-lg text-gray-300 opacity-90" />
                </div>
              </div>
            </div>

            <div className="overflow-auto flex-grow">
              <a
                href="/"
                className="flex items-center gap-3 px-4 py-3 bg-transparent hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary"
              >
                <div className="i-ph:plus-circle opacity-90 text-gray-200 text-lg" />
                <span>Start new chat</span>
              </a>

              <div className="text-bolt-elements-textSecondary text-sm font-medium px-4 py-2">Your Chats</div>
              <div className="flex-1 overflow-auto px-3 pb-3">
                {filteredItems.length === 0 && (
                  <div className="px-4 text-bolt-elements-textSecondary text-sm">
                    {list.length === 0 ? 'No previous conversations' : 'No matches found'}
                  </div>
                )}
                <DialogRoot open={dialogContent !== null}>
                  {binDates(filteredItems).map(({ category, items }) => (
                    <div key={category} className="mt-2 first:mt-0 space-y-1">
                      <div className="text-xs font-medium text-bolt-elements-textSecondary sticky top-0 z-1 bg-bolt-elements-background-depth-2 px-4 py-1">
                        {category}
                      </div>
                      <div className="space-y-0.5 pr-1">
                        {items.map((item) => (
                          <HistoryItem
                            key={item.id}
                            item={item}
                            exportChat={exportChat}
                            onDelete={(event) => handleDeleteClick(event, item)}
                            onDuplicate={() => handleDuplicate(item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
                    {dialogContent?.type === 'delete' && (
                      <>
                        <div className="p-6 bg-bolt-elements-background-depth-1">
                          <DialogTitle className="text-bolt-elements-textPrimary">Delete Chat?</DialogTitle>
                          <DialogDescription className="mt-2 text-bolt-elements-textSecondary">
                            <p>
                              You are about to delete{' '}
                              <span className="font-medium text-bolt-elements-textPrimary">
                                {dialogContent.item.description}
                              </span>
                            </p>
                            <p className="mt-2">Are you sure you want to delete this chat?</p>
                          </DialogDescription>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-bolt-elements-background-depth-2 border-t border-bolt-elements-borderColor">
                          <DialogButton type="secondary" onClick={closeDialog}>
                            Cancel
                          </DialogButton>
                          <DialogButton
                            type="danger"
                            onClick={(event) => {
                              deleteItem(event, dialogContent.item);
                              closeDialog();
                            }}
                          >
                            Delete
                          </DialogButton>
                        </div>
                      </>
                    )}
                  </Dialog>
                </DialogRoot>
              </div>
              <div className="flex items-center justify-between border-t border-bolt-elements-borderColor px-4 py-3">
                <SettingsButton onClick={handleSettingsClick} />
                <ThemeSwitch />
              </div>
            </div>
          </>
        )}
      </motion.div>
      {!open && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="fixed top-0 left-0 h-full w-12 bg-bolt-elements-background-depth-2 border-r border-bolt-elements-borderColor flex flex-col items-center pt-5 cursor-pointer hover:bg-bolt-elements-background-depth-3 transition-colors z-10 group"
          onClick={toggleSidebar}
          title="Expand sidebar"
        >
          <div
            className="i-ph:sidebar-simple-duotone text-xl text-gray-200 group-hover:text-bolt-elements-accent transition-colors rotate-180"
          />
          <div className="mt-4 text-gray-200 group-hover:text-bolt-elements-accent text-xs font-medium transition-colors" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
            Open Menu
          </div>
          <div className="absolute top-0 right-0 h-full w-1 bg-transparent group-hover:bg-bolt-elements-accent transition-colors"></div>
        </motion.div>
      )}
      <ControlPanel open={isSettingsOpen} onClose={handleSettingsClose} />
    </>
  );
};
