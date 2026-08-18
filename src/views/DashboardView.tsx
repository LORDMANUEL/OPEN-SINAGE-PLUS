import { AlertCircle, CheckCircle2, Monitor, Package } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function DashboardView() {
  const { screens, mediaLibrary, tickets } = useAppContext();
  const allScreens = [...screens.signage, ...screens.kiosk, ...screens.dashboard];
  const onlineScreens = allScreens.filter(screen => screen.status === 'online').length;
  const pendingTickets = tickets.filter(ticket => ticket.status === 'pending').length;

  const stats = [
    { label: 'Pantallas locales', value: allScreens.length, icon: Monitor, detail: 'Inventario visual actual' },
    { label: 'Online', value: onlineScreens, icon: CheckCircle2, detail: 'Estado local/demo' },
    { label: 'Media', value: mediaLibrary.length, icon: Package, detail: 'Assets disponibles' },
    { label: 'Tickets', value: pendingTickets, icon: AlertCircle, detail: 'Pendientes de atención' },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-cyan-900 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Open Signage Plus V2</p>
        <h2 className="mt-2 text-3xl font-bold">Xibo como motor. Nuestra experiencia encima.</h2>
        <p className="mt-3 max-w-3xl text-slate-200">
          Esta rama reemplaza el backend mock por un gateway OAuth2 real hacia Xibo y añade la base PWA. Usa “Motor Xibo” para verificar la instalación y los displays reales.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => (
          <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-400">{stat.detail}</p>
              </div>
              <div className="rounded-xl bg-cyan-50 p-3 text-cyan-700"><stat.icon size={22} /></div>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <ModuleCard title="Motor Xibo" status="Implementado" description="OAuth2 server-side, health, displays y scheduling API." />
        <ModuleCard title="Admin PWA" status="Implementado" description="Manifest, service worker y UI guiada para integración." />
        <ModuleCard title="Studio / IA / Tickets" status="Siguiente" description="Se conectarán sobre la misma capa API sin exponer Xibo." />
      </div>
    </section>
  );
}

function ModuleCard({ title, status, description }: { title: string; status: string; description: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{status}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}
