import { useEffect, useState, type ReactNode } from 'react';
import { openSignageApi, type SessionUser } from '../services/openSignageApi';
import { AppContext, type AppContextValue, type NotificationRecord, type UserRecord } from './app-context';

function toUser(user: SessionUser): UserRecord {
  const avatars = { admin: '🛡️', marketing: '🎨', operator: '🎛️', viewer: '👁️' } as const;
  return { id: user.id, email: user.email, role: user.role, name: user.name || user.email, avatar: avatars[user.role] || '👤' };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  const notify = (type: NotificationRecord['type'], message: string) => {
    setNotifications(current => [{ id: Date.now(), type, message, time: new Date() }, ...current].slice(0, 10));
  };

  useEffect(() => {
    let disposed = false;
    async function restore() {
      if (!openSignageApi.hasSession()) { if (!disposed) setAuthReady(true); return; }
      try {
        const user = await openSignageApi.session();
        if (!disposed) { setCurrentUser(toUser(user)); setIsLoggedIn(true); }
      } catch { openSignageApi.logout(); }
      finally { if (!disposed) setAuthReady(true); }
    }
    void restore();
    return () => { disposed = true; };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const session = await openSignageApi.login(email, password);
      setCurrentUser(toUser(session.user));
      setIsLoggedIn(true);
      notify('success', `Sesión iniciada como ${session.user.name || session.user.email}`);
      return true;
    } catch {
      notify('error', 'Credenciales incorrectas');
      return false;
    }
  };

  const handleLogout = () => { openSignageApi.logout(); setIsLoggedIn(false); setCurrentUser(null); };
  const value: AppContextValue = { isLoggedIn, authReady, currentUser, notifications, handleLogin, handleLogout };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
