import { useEffect, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { useAppContext } from '../context/app-context';

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard General',
  studio: 'Studio',
  ai: 'AI Studio',
  media: 'Biblioteca multimedia',
  queues: 'Turnos y colas',
  integration: 'Motor Xibo',
  signage: 'Pantallas Xibo',
  kiosk: 'Kioscos y Browser Players',
  dashboards: 'Layouts y Dashboards Xibo',
  settings: 'Configuración',
};

export default function TopBar({ currentView }: { currentView: string }) {
  const { notifications } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div><span className="eyebrow">OPEN SIGNAGE PLUS</span><h1>{viewTitles[currentView] ?? 'Open Signage Plus'}</h1></div>
      <div className="topbar__actions">
        <button type="button" aria-label="Notificaciones" className="icon-button"><Bell size={19} />{notifications.length > 0 && <b className="notification-badge">{notifications.length}</b>}</button>
        <div className="clock-chip"><Clock size={16} /><span>{currentTime.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}</span></div>
      </div>
    </header>
  );
}
