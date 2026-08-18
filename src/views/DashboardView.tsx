import { AlertCircle, CheckCircle2, Monitor, Package, PlugZap, Smartphone, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/app-context';

export default function DashboardView() {
  const { screens, mediaLibrary, tickets } = useAppContext();
  const allScreens = [...screens.signage, ...screens.kiosk, ...screens.dashboard];
  const onlineScreens = allScreens.filter(screen => screen.status === 'online').length;
  const pendingTickets = tickets.filter(ticket => ticket.status === 'pending').length;

  const stats = [
    { label: 'Pantallas locales', value: allScreens.length, icon: Monitor, note: 'Inventario visual actual' },
    { label: 'Online', value: onlineScreens, icon: CheckCircle2, note: 'Estado local/demo' },
    { label: 'Media', value: mediaLibrary.length, icon: Package, note: 'Assets disponibles' },
    { label: 'Tickets', value: pendingTickets, icon: AlertCircle, note: 'Pendientes de atención' },
  ];

  return (
    <section className="dashboard">
      <div className="hero-card">
        <div><span className="eyebrow eyebrow--light">OPEN SIGNAGE PLUS V2</span><h2>Xibo hace el trabajo pesado. Open Signage lo vuelve sencillo.</h2><p>Controla displays, contenidos y programación sin exponer la interfaz nativa de Xibo. La misma base soportará kioscos, QR, tickets e IA.</p></div>
        <div className="hero-card__signal"><PlugZap size={32} /><strong>API first</strong><span>PWA + Xibo OAuth2</span></div>
      </div>

      <div className="metric-grid">
        {stats.map(stat => <article className="metric-card" key={stat.label}><div className="metric-card__icon"><stat.icon size={21} /></div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></article>)}
      </div>

      <div className="module-grid">
        <Module icon={<PlugZap size={21} />} title="Motor Xibo" status="Operativo" text="OAuth2 server-side, catálogo, publicación y scheduling mediante nuestra API." />
        <Module icon={<Smartphone size={21} />} title="PWA" status="Operativo" text="Instalable desde navegador y preparada para experiencia multidispositivo." />
        <Module icon={<Sparkles size={21} />} title="IA + Tickets" status="En construcción" text="Proveedor local/API, generación guiada, QR, colas e interacción táctil." />
      </div>
    </section>
  );
}

function Module({ icon, title, status, text }: { icon: React.ReactNode; title: string; status: string; text: string }) {
  return <article className="module-card"><div className="module-card__top"><span className="module-card__icon">{icon}</span><span className="pill">{status}</span></div><h3>{title}</h3><p>{text}</p></article>;
}
