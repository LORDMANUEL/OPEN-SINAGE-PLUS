import React, { useState, useEffect } from 'react';
import { Bell, Clock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const TopBar = ({ currentView }) => {
  const { notifications } = useAppContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const viewTitles = {
    dashboard: '📊 Dashboard General',
    signage: '🖥️ Pantallas Digital Signage',
    kiosk: '📱 Kioscos Interactivos',
    dashboards: '📈 Dashboards BI',
    media: '🎬 Biblioteca Multimedia',
    'ai-generator': '✨ Generador con IA',
    'image-generator': '🎨 Generador de Imágenes',
    'video-generator': '🎬 Generador de Videos',
    animations: '🎞️ Creador de Animaciones',
    'layout-builder': '🎯 Constructor de Layouts',
    backups: '💾 Sistema de Backups',
    database: '🗄️ Conexión Base de Datos',
    tickets: '🎫 Sistema de Tickets',
    settings: '⚙️ Configuración',
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {viewTitles[currentView]}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-all">
            <Bell size={20} className="text-slate-600" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </button>

          {notifications.length > 0 && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 max-h-96 overflow-y-auto z-50">
              {notifications.map(notif => (
                <div key={notif.id} className={`p-3 rounded-lg mb-2 ${
                  notif.type === 'success' ? 'bg-green-50 border border-green-200' :
                  notif.type === 'error' ? 'bg-red-50 border border-red-200' :
                  'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className="text-sm font-semibold text-slate-800">{notif.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {notif.time.toLocaleTimeString('es-ES')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100">
          <Clock size={16} className="text-slate-600" />
          <span className="text-sm font-medium text-slate-700">
            {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
