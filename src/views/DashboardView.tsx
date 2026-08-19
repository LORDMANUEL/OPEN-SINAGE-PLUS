import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Monitor, Package, PlugZap, Smartphone, Sparkles } from 'lucide-react';
import { openSignageApi } from '../services/openSignageApi';

interface DashboardSnapshot {
  displays: number | null;
  online: number | null;
  media: number | null;
  pending: number | null;
  browser: number | null;
}

const emptySnapshot: DashboardSnapshot = { displays: null, online: null, media: null, pending: null, browser: null };

export default function DashboardView() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let disposed = false;
    async function load() {
      const [displaysResult, mediaResult, ticketsResult, devicesResult] = await Promise.allSettled([
        openSignageApi.xiboDisplays(),
        openSignageApi.xiboLibrary(),
        openSignageApi.listTickets('recepcion'),
        openSignageApi.listDevices(),
      ]);
      if (disposed) return;
      const displays = displaysResult.status === 'fulfilled' ? displaysResult.value : null;
      const media = mediaResult.status === 'fulfilled' ? mediaResult.value : null;
      const tickets = ticketsResult.status === 'fulfilled' ? ticketsResult.value : null;
      const devices = devicesResult.status === 'fulfilled' ? devicesResult.value : null;
      setSnapshot({
        displays: displays?.length ?? null,
        online: displays ? displays.filter(display => Boolean(display.loggedIn)).length : null,
        media: media?.length ?? null,
        pending: tickets ? tickets.filter(ticket => ticket.status === 'waiting').length : null,
        browser: devices?.length ?? null,
      });
      const failed = [displaysResult, mediaResult, ticketsResult, devicesResult].filter(result => result.status === 'rejected').length;
      setMessage(failed ? `${failed} fuente(s) no disponibles. Conecta Xibo o revisa los servicios PLUS para completar el tablero.` : 'Datos sincronizados desde Xibo y servicios PLUS.');
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, []);

  const stats = [
    { label: 'Pantallas Xibo', value: `${snapshot.displays ?? '—'} displays`, icon: Monitor, note: 'Inventario real de Xibo' },
    { label: 'Conectadas', value: `${snapshot.online ?? '—'} online`, icon: CheckCircle2, note: 'Estado reportado por Xibo' },
    { label: 'Biblioteca', value: `${snapshot.media ?? '—'} media`, icon: Package, note: 'Assets reales de Xibo' },
    { label: 'Turnos', value: `${snapshot.pending ?? '—'} pendientes`, icon: AlertCircle, note: 'Cola recepción' },
    { label: 'Browser Player', value: `${snapshot.browser ?? '—'} browser`, icon: Smartphone, note: 'Dispositivos /screen registrados' },
  ];

  return (
    <section className="dashboard">
      <div className="hero-card">
        <div>
          <span className="eyebrow eyebrow--light">OPEN SIGNAGE PLUS V2</span>
          <h2>Xibo hace el trabajo pesado. Open Signage lo vuelve sencillo.</h2>
          <p>Datos reales, creación guiada, IA, turnos y reproducción browser-first desde una sola capa operativa.</p>
        </div>
        <div className="hero-card__signal"><PlugZap size={32} /><strong>API first</strong><span>PWA + Xibo OAuth2</span></div>
      </div>
      <div className="metric-grid">
        {stats.map(stat => <article className="metric-card" key={stat.label}><div className="metric-card__icon"><stat.icon size={21} /></div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></article>)}
      </div>
      {message && <div className="notice">{message}</div>}
      <div className="module-grid">
        <Module icon={<PlugZap size={21} />} title="Motor Xibo" status="Operativo" text="OAuth2 server-side, media, layouts, playlists, publicación y scheduling." />
        <Module icon={<Smartphone size={21} />} title="Browser Player" status="Operativo" text="Pantallas y kioscos por URL, pairing con código corto y cache local de contenido." />
        <Module icon={<Sparkles size={21} />} title="IA + QR + Turnos" status="Operativo" text="IA local/API con aprobación, QR, acciones táctiles y colas persistentes." />
      </div>
    </section>
  );
}

function Module({ icon, title, status, text }: { icon: ReactNode; title: string; status: string; text: string }) {
  return <article className="module-card"><div className="module-card__top"><span className="module-card__icon">{icon}</span><span className="pill">{status}</span></div><h3>{title}</h3><p>{text}</p></article>;
}
