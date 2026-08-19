import { useState, type ComponentType } from 'react';
import { BarChart3, Bot, Building2, CalendarDays, Home, Image, LayoutTemplate, ListOrdered, LogOut, Menu, Monitor, PlugZap, Settings, ShieldCheck, Smartphone, X } from 'lucide-react';
import { useAppContext } from '../context/app-context';

type SidebarProps = { currentView: string; setCurrentView: (view: string) => void };
type MenuItem = { id: string; label: string; icon: ComponentType<{ size?: number }> };

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { currentUser, handleLogout } = useAppContext();
  const [open, setOpen] = useState(true);
  const role = currentUser?.role || 'viewer';
  const canCreate = role === 'admin' || role === 'marketing';
  const canOperateQueues = role === 'admin' || role === 'operator';
  const canPlan = role === 'admin' || role === 'marketing' || role === 'viewer';
  const canOperate = role !== 'viewer';
  const items: MenuItem[] = [
    { id: 'dashboard', icon: Home, label: 'Inicio' },
    ...(canOperate ? [{ id: 'operations', icon: ShieldCheck, label: 'Operaciones' } as MenuItem] : []),
    ...(role === 'admin' ? [{ id: 'business', icon: Building2, label: 'Empresas y formularios' } as MenuItem] : []),
    ...(canPlan ? [{ id: 'planning', icon: CalendarDays, label: 'Planificación y analytics' } as MenuItem] : []),
    ...(canCreate ? [{ id: 'studio', icon: LayoutTemplate, label: 'Studio' } as MenuItem, { id: 'ai', icon: Bot, label: 'AI Studio' } as MenuItem, { id: 'media', icon: Image, label: 'Media' } as MenuItem] : []),
    ...(canOperateQueues ? [{ id: 'queues', icon: ListOrdered, label: 'Turnos' } as MenuItem] : []),
    ...(role === 'admin' || role === 'marketing' || role === 'viewer' ? [{ id: 'integration', icon: PlugZap, label: 'Motor Xibo' } as MenuItem] : []),
    { id: 'signage', icon: Monitor, label: 'Pantallas' },
    ...(role !== 'viewer' ? [{ id: 'kiosk', icon: Smartphone, label: 'Kioscos' } as MenuItem] : []),
    { id: 'dashboards', icon: BarChart3, label: 'Dashboards' },
  ];
  const roleLabels = { admin: 'Administrador', marketing: 'Marketing', operator: 'Operador', viewer: 'Visualizador' } as const;

  return <aside className={`sidebar ${open ? '' : 'sidebar--collapsed'}`}>
    <div className="sidebar__brand">{open && <div><strong>Open Signage <span>+</span></strong><small>Xibo engine · PWA</small></div>}<button className="icon-button icon-button--ghost" type="button" aria-label="Alternar menú" onClick={() => setOpen(value => !value)}>{open ? <X size={18}/> : <Menu size={18}/>}</button></div>
    {open && currentUser && <div className="sidebar__user"><span>{currentUser.avatar}</span><div><strong>{currentUser.name}</strong><small>{roleLabels[currentUser.role]}</small></div></div>}
    <nav className="sidebar__nav" aria-label="Navegación principal" style={{ flex: 1, minHeight: 0, overflowY: 'auto', alignContent: 'start' }}>{items.map(item => <button key={item.id} type="button" title={item.label} className={`sidebar__item ${currentView === item.id ? 'sidebar__item--active' : ''}`} onClick={() => setCurrentView(item.id)}><item.icon size={19}/>{open && <span>{item.label}</span>}</button>)}</nav>
    <div className="sidebar__footer" style={{ flexShrink: 0 }}>{role === 'admin' && <button type="button" className="sidebar__item" onClick={() => setCurrentView('settings')}><Settings size={19}/>{open && <span>Configuración</span>}</button>}<button type="button" className="sidebar__item sidebar__item--danger" onClick={handleLogout}><LogOut size={19}/>{open && <span>Cerrar sesión</span>}</button></div>
  </aside>;
}
