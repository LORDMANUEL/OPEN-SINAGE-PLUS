import { createContext, useContext } from 'react';

export type ScreenType = 'signage' | 'kiosk' | 'dashboard';
export interface UserRecord { email: string; role: 'admin_it'; name: string; avatar: string }
export interface NotificationRecord { id: number; type: 'success' | 'error' | 'info'; message: string; time: Date }

export type AppContextValue = {
  isLoggedIn: boolean;
  authReady: boolean;
  currentUser: UserRecord | null;
  notifications: NotificationRecord[];
  handleLogin: (email: string, password: string) => Promise<boolean>;
  handleLogout: () => void;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside AppProvider');
  return context;
}
