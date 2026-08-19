import { useEffect, useState, type ReactNode } from 'react';
import { initialMediaLibrary, initialScreens, initialTickets } from '../data/mockData';
import { openSignageApi } from '../services/openSignageApi';
import { AppContext, type AppContextValue, type NotificationRecord, type ScreenRecord, type ScreensState, type ScreenType, type UserRecord } from './app-context';

function normalizeInitialScreens(): ScreensState {
  return { signage: initialScreens.signage as ScreenRecord[], kiosk: initialScreens.kiosk as ScreenRecord[], dashboard: initialScreens.dashboard as ScreenRecord[] };
}
function toUser(email: string, name?: string): UserRecord { return { email, role: 'admin_it', name: name || 'Administrador', avatar: '🛡️' }; }

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [screens, setScreens] = useState<ScreensState>(normalizeInitialScreens);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const notify = (type: NotificationRecord['type'], message: string) => setNotifications(current => [{ id: Date.now(), type, message, time: new Date() }, ...current].slice(0, 10));

  useEffect(() => {
    let disposed = false;
    async function restore() {
      if (!openSignageApi.hasSession()) { if (!disposed) setAuthReady(true); return; }
      try {
        const user = await openSignageApi.session();
        if (!disposed) { setCurrentUser(toUser(user.email, user.name)); setIsLoggedIn(true); }
      } catch { openSignageApi.logout(); }
      finally { if (!disposed) setAuthReady(true); }
    }
    void restore();
    return () => { disposed = true; };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const session = await openSignageApi.login(email, password);
      setCurrentUser(toUser(session.user.email, session.user.name));
      setIsLoggedIn(true);
      notify('success', `Sesión iniciada como ${session.user.name || session.user.email}`);
      return true;
    } catch {
      notify('error', 'Credenciales incorrectas');
      return false;
    }
  };

  const handleLogout = () => { openSignageApi.logout(); setIsLoggedIn(false); setCurrentUser(null); };

  const createNewScreen = (type: ScreenType) => {
    const labels: Record<ScreenType, string> = { signage: 'Digital Signage', kiosk: 'Kiosco', dashboard: 'Dashboard' };
    setScreens(current => {
      const next: ScreenRecord = { id: Date.now(), name: `Nueva ${labels[type]} ${current[type].length + 1}`, zone: 'Sin asignar', status: 'offline', orientation: type === 'kiosk' ? 'vertical' : 'horizontal', layout: 'default', lastSync: 'Nunca' };
      notify('success', `Pantalla local creada: ${next.name}`);
      return { ...current, [type]: [...current[type], next] };
    });
  };
  const deleteScreen = (type: ScreenType, id: number) => { setScreens(current => ({ ...current, [type]: current[type].filter(screen => screen.id !== id) })); notify('success', 'Pantalla local eliminada'); };

  const value: AppContextValue = { isLoggedIn, authReady, currentUser, screens, mediaLibrary: initialMediaLibrary, tickets: initialTickets, notifications, handleLogin, handleLogout, createNewScreen, deleteScreen };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
