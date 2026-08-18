import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { initialMediaLibrary, initialScreens, initialTickets, users } from '../data/mockData';

export type ScreenType = 'signage' | 'kiosk' | 'dashboard';
export type ScreenStatus = 'online' | 'offline';
export type ScreenOrientation = 'horizontal' | 'vertical';

export interface ScreenRecord {
  id: number;
  name: string;
  zone: string;
  status: ScreenStatus;
  orientation: ScreenOrientation;
  layout: string;
  lastSync: string;
  aiGenerated?: boolean;
}

export interface UserRecord {
  email: string;
  password: string;
  role: 'admin_it' | 'marketeer';
  name: string;
  avatar: string;
}

export interface NotificationRecord {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  time: Date;
}

type ScreensState = Record<ScreenType, ScreenRecord[]>;

type AppContextValue = {
  isLoggedIn: boolean;
  currentUser: UserRecord | null;
  screens: ScreensState;
  mediaLibrary: typeof initialMediaLibrary;
  tickets: typeof initialTickets;
  notifications: NotificationRecord[];
  handleLogin: (email: string, password: string) => boolean;
  handleLogout: () => void;
  createNewScreen: (type: ScreenType) => void;
  deleteScreen: (type: ScreenType, id: number) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function normalizeInitialScreens(): ScreensState {
  return {
    signage: initialScreens.signage as ScreenRecord[],
    kiosk: initialScreens.kiosk as ScreenRecord[],
    dashboard: initialScreens.dashboard as ScreenRecord[],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [screens, setScreens] = useState<ScreensState>(normalizeInitialScreens);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const notify = (type: NotificationRecord['type'], message: string) => {
    setNotifications(current => [
      { id: Date.now(), type, message, time: new Date() },
      ...current,
    ].slice(0, 10));
  };

  const handleLogin = (email: string, password: string) => {
    const account = users[email as keyof typeof users];
    if (!account || account.password !== password) {
      notify('error', 'Credenciales incorrectas');
      return false;
    }

    setCurrentUser({ email, ...account } as UserRecord);
    setIsLoggedIn(true);
    notify('success', `Sesión iniciada como ${account.name}`);
    return true;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const createNewScreen = (type: ScreenType) => {
    const labels: Record<ScreenType, string> = {
      signage: 'Digital Signage',
      kiosk: 'Kiosco',
      dashboard: 'Dashboard',
    };

    setScreens(current => {
      const next: ScreenRecord = {
        id: Date.now(),
        name: `Nueva ${labels[type]} ${current[type].length + 1}`,
        zone: 'Sin asignar',
        status: 'offline',
        orientation: type === 'kiosk' ? 'vertical' : 'horizontal',
        layout: 'default',
        lastSync: 'Nunca',
      };
      notify('success', `Pantalla local creada: ${next.name}`);
      return { ...current, [type]: [...current[type], next] };
    });
  };

  const deleteScreen = (type: ScreenType, id: number) => {
    setScreens(current => ({ ...current, [type]: current[type].filter(screen => screen.id !== id) }));
    notify('success', 'Pantalla local eliminada');
  };

  const value = useMemo<AppContextValue>(() => ({
    isLoggedIn,
    currentUser,
    screens,
    mediaLibrary: initialMediaLibrary,
    tickets: initialTickets,
    notifications,
    handleLogin,
    handleLogout,
    createNewScreen,
    deleteScreen,
  }), [isLoggedIn, currentUser, screens, notifications]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside AppProvider');
  return context;
}
