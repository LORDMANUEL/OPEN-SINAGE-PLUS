import { useEffect, useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { useAppContext } from '../context/app-context';

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard General',
  integration: 'Motor Xibo',
  signage: 'Pantallas Digital Signage',
  kiosk: 'Kioscos Interactivos',
  dashboards: 'Dashboards BI',
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
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">Open Signage Plus</p>
        <h1 className="text-2xl font-bold text-slate-800">{viewTitles[currentView] ?? 'Open Signage Plus'}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button type="button" aria-label="Notificaciones" className="relative rounded-lg p-2 transition-all hover:bg-slate-100">
            <Bell size={20} className="text-slate-600" />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {notifications.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
          <Clock size={16} className="text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            {currentTime.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </header>
  );
}
