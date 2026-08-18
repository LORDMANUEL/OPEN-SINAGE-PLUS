import { useState, type ComponentType } from 'react';
import { BarChart3, Home, LogOut, Menu, Monitor, PlugZap, Settings, Smartphone, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

type SidebarProps = {
  currentView: string;
  setCurrentView: (view: string) => void;
};

type MenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  count?: number;
};

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { currentUser, screens, handleLogout } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'integration', icon: PlugZap, label: 'Motor Xibo' },
    { id: 'signage', icon: Monitor, label: 'Pantallas Signage', count: screens.signage.length },
    { id: 'kiosk', icon: Smartphone, label: 'Kioscos', count: screens.kiosk.length },
    { id: 'dashboards', icon: BarChart3, label: 'Dashboards BI', count: screens.dashboard.length },
  ];

  return (
    <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} fixed left-0 top-0 z-40 h-screen overflow-y-auto border-r border-white/10 bg-gradient-to-b from-slate-950 to-slate-800 shadow-2xl transition-all duration-300`}>
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        {sidebarOpen && (
          <div>
            <h2 className="font-bold text-white">Open Signage Plus</h2>
            <p className="text-xs text-cyan-300">Xibo-backed V2</p>
          </div>
        )}
        <button type="button" aria-label="Alternar menú" onClick={() => setSidebarOpen(value => !value)} className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {sidebarOpen && currentUser && (
        <div className="border-b border-white/10 p-4">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="font-semibold text-white">{currentUser.avatar} {currentUser.name}</div>
            <div className="mt-1 text-xs text-cyan-300">{currentUser.role === 'admin_it' ? 'Administrador' : 'Marketing'}</div>
          </div>
        </div>
      )}

      <nav className="space-y-2 p-4">
        {menuItems.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentView(item.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all ${currentView === item.id ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            <item.icon size={20} />
            {sidebarOpen && <span className="flex-1 text-left text-sm font-medium">{item.label}</span>}
            {sidebarOpen && item.count !== undefined && <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">{item.count}</span>}
          </button>
        ))}
      </nav>

      {sidebarOpen && (
        <div className="space-y-2 border-t border-white/10 p-4">
          <button type="button" onClick={() => setCurrentView('settings')} className="flex w-full items-center gap-3 rounded-xl bg-cyan-500/10 px-4 py-3 text-cyan-200 hover:bg-cyan-500/20">
            <Settings size={20} />
            <span className="font-medium">Configuración</span>
          </button>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-red-200 hover:bg-red-500/20">
            <LogOut size={20} />
            <span className="font-medium">Cerrar sesión</span>
          </button>
        </div>
      )}
    </aside>
  );
}
