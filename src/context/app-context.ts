import { createContext, useContext } from 'react';
import { initialMediaLibrary, initialTickets } from '../data/mockData';

export type ScreenType = 'signage' | 'kiosk' | 'dashboard';
export type ScreenStatus = 'online' | 'offline';
export type ScreenOrientation = 'horizontal' | 'vertical';

export interface ScreenRecord { id: number; name: string; zone: string; status: ScreenStatus; orientation: ScreenOrientation; layout: string; lastSync: string; aiGenerated?: boolean }
export interface UserRecord { email: string; role: 'admin_it'; name: string; avatar: string }
export interface NotificationRecord { id: number; type: 'success' | 'error' | 'info'; message: string; time: Date }
export type ScreensState = Record<ScreenType, ScreenRecord[]>;

export type AppContextValue = {
  isLoggedIn: boolean;
  authReady: boolean;
  currentUser: UserRecord | null;
  screens: ScreensState;
  mediaLibrary: typeof initialMediaLibrary;
  tickets: typeof initialTickets;
  notifications: NotificationRecord[];
  handleLogin: (email: string, password: string) => Promise<boolean>;
  handleLogout: () => void;
  createNewScreen: (type: ScreenType) => void;
  deleteScreen: (type: ScreenType, id: number) => void;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);
export function useAppContext(): AppContextValue { const context = useContext(AppContext); if (!context) throw new Error('useAppContext must be used inside AppProvider'); return context; }
