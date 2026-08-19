import { useState, type ComponentType } from 'react';
import { BarChart3, Bot, Home, Image, LayoutTemplate, ListOrdered, LogOut, Menu, Monitor, PlugZap, Settings, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useAppContext } from '../context/app-context';

type SidebarProps = { currentView: string; setCurrentView: (view: string) => void };
type MenuItem = { id: string; label: string; icon: ComponentType<{ size?: number }> };

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { currentUser, handleLogout } = useAppContext();
  const [open, setOpen] = useState(true);
  const items: MenuItem[] = [
    { id: 'dashboard', icon: Home, label: 'Inicio' },
    { id: 'operations', icon: ShieldCheck, label: 'Operaciones' },
    { id: 'studio', icon: LayoutTemplate, label: 'Studio' },
    { id: 'ai', icon: Bot, label: 'AI Studio' },
    { id: 'media', icon: Image, label: 'Media' },
    { id: 'queues', icon: ListOrdered, label: 'Turnos' },
    { id: 'integration', icon: PlugZap, label: 'Motor Xibo' },
    { id: 'signage', icon: Monitor, label: 'Pantallas' },
    { id: 'kiosk', icon: Smartphone, label: 'Kioscos' },
    { id: 'dashboards', icon: BarChart3, label: 'Dashboards' },
  ];
  const roleLabels = { admin: 'Administrador', marketing: 'Marketing', operator: 'Operador', viewer: 'Visualizador' } as const;

  return (
    <aside className={`sidebar ${open ? '' : 'sidebar--collapsed'}`}>
      <div className="sidebar__brand">
        {open && <div><strong>Open Signage <span>+</span></strong><small>Xibo engine · PWA</small></div>}
        <button className="icon-button icon-button--ghost" type="button" aria-label="Alternar menú" onClick={() => setOpen(value => !value)}>{open ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
      {open && currentUser && <div className="sidebar__user"><span>{currentUser.avatar}</span><div><strong>{currentUser.name}</strong><small>{roleLabels[currentUser.role]}</small></div></div>}
      <nav className="sidebar__nav" aria-label="Navegación principal">
        {items.map(item => <button key={item.id} type="button" title={item.label} className={`sidebar__item ${currentView === item.id ? 'sidebar__item--active' : ''}`} onClick={() => setCurrentView(item.id)}><item.icon size={19} />{open && <span>{item.label}</span>}</button>)}
      </nav>
      <div className="sidebar__footer">
        <button type="button" className="sidebar__item" onClick={() => setCurrentView('settings')}><Settings size={19} />{open && <span>Configuración</span>}</button>
        <button type="button" className="sidebar__item sidebar__item--danger" onClick={handleLogout}><LogOut size={19} />{open && <span>Cerrar sesión</span>}</button>
      </div>
    </aside>
  );
}
