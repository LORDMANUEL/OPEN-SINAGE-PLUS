import React, { useState } from 'react';
import {
  Monitor, Smartphone, BarChart3, Image, Wand2, Film, HardDrive,
  Database, Ticket, LogOut, Menu, X, Home, Settings,
  Grid3x3, Video
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Sidebar = ({ currentView, setCurrentView }) => {
  const { currentUser, screens, tickets, handleLogout } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', permission: 'dashboard' },
    { id: 'signage', icon: Monitor, label: 'Pantallas Signage', permission: 'signage', count: screens.signage.length },
    { id: 'kiosk', icon: Smartphone, label: 'Kioscos', permission: 'kiosk', count: screens.kiosk.length },
    { id: 'dashboards', icon: BarChart3, label: 'Dashboards BI', permission: 'dashboards', count: screens.dashboard.length },
    { id: 'media', icon: Image, label: 'Biblioteca Multimedia', permission: 'media' },
    { id: 'ai-generator', icon: Wand2, label: 'Generador IA', permission: 'ai-generator', badge: '✨' },
    { id: 'image-generator', icon: Palette, label: 'Generador Imágenes', permission: 'image-generator', badge: '🎨' },
    { id: 'video-generator', icon: Video, label: 'Generador Videos', permission: 'video-generator', badge: '🎬' },
    { id: 'animations', icon: Film, label: 'Animaciones', permission: 'animations' },
    { id: 'layout-builder', icon: Grid3x3, label: 'Layout Builder', permission: 'layout-builder', badge: '🎯' },
    { id: 'backups', icon: HardDrive, label: 'Backups', permission: 'backups', adminOnly: true },
    { id: 'database', icon: Database, label: 'Conexión BD', permission: 'database', adminOnly: true },
    { id: 'tickets', icon: Ticket, label: 'Sistema Tickets', permission: 'tickets', adminOnly: true, alert: tickets.filter(t => t.status === 'pending').length }
  ];

  const hasPermission = (permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin_it') return true;

    const allowedForMarketer = [
      'dashboard', 'signage', 'kiosk', 'dashboards',
      'media', 'ai-generator', 'image-generator',
      'video-generator', 'animations'
    ];

    return allowedForMarketer.includes(permission);
  };

  return (
    <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-800 h-screen fixed left-0 top-0 transition-all duration-300 shadow-2xl z-40 border-r border-white/10 overflow-y-auto`}>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        {sidebarOpen && (
          <div className="flex items-center gap-3">
            <div className="text-3xl">🖥️</div>
            <div>
              <h2 className="text-white font-bold">Signage PRO</h2>
              <p className="text-xs text-purple-300">Enterprise v2.0</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {sidebarOpen && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
            <div className="text-3xl">{currentUser.avatar}</div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">{currentUser.name}</div>
              <div className="text-xs text-purple-300">
                {currentUser.role === 'admin_it' ? 'Admin IT' : 'Mercadólogo'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        {menuItems.map(item => {
          if (item.adminOnly && !hasPermission('backups')) return null;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                  {item.count !== undefined && (
                    <span className="px-2 py-1 rounded-full bg-white/20 text-xs font-bold">
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="text-xs">{item.badge}</span>
                  )}
                  {item.alert > 0 && (
                    <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                      {item.alert}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {sidebarOpen && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setCurrentView('settings')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 transition-all"
          >
            <Settings size={20} />
            <span className="font-medium">Configuración API</span>
          </button>
        </div>
      )}

      {sidebarOpen && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
