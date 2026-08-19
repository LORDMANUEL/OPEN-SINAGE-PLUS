import { useState, type ReactNode } from 'react';
import { initialMediaLibrary, initialScreens, initialTickets, users } from '../data/mockData';
import {
  AppContext,
  type AppContextValue,
  type NotificationRecord,
  type ScreenRecord,
  type ScreensState,
  type ScreenType,
  type UserRecord,
} from './app-context';

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

  const value: AppContextValue = {
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
