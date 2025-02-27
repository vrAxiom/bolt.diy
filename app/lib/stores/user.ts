import { atom } from 'nanostores';
import type { User } from '~/types/auth';

// User store to manage the current authenticated user
interface UserState {
  user: User | null;
  isAuthenticated: boolean;
}

// Initial state
const initialState: UserState = {
  user: null,
  isAuthenticated: false,
};

// Create the store
export const userStore = atom<UserState>(initialState);

// Actions
export function setUser(user: User | null) {
  userStore.set({
    user,
    isAuthenticated: !!user,
  });
}

export function clearUser() {
  userStore.set(initialState);
}

// Add store methods directly to the store object
userStore.setUser = setUser;
userStore.clearUser = clearUser;
