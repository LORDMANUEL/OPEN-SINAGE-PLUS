import { MapPin, Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react';
import { useAppContext, type ScreenType } from '../context/app-context';

type ScreenListViewProps = {
  type: ScreenType;
  title: string;
};

export default function ScreenListView({ type, title }: ScreenListViewProps) {
  const { screens, createNewScreen, deleteScreen } = useAppContext();
  const screensList = screens[type];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <p className="mt-1 text-slate-600">Inventario local: {screensList.length}. Los displays Xibo reales se consultan desde “Motor Xibo”.</p>
        </div>
        <button
          type="button"
          onClick={() => createNewScreen(type)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 px-5 py-3 font-semibold text-white shadow-lg"
        >
          <Plus size={20} /> Nueva pantalla local
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {screensList.map(screen => (
          <article key={screen.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{screen.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {screen.zone}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${screen.status === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {screen.status}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-blue-700">
                {screen.orientation === 'horizontal' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                {screen.orientation}
              </span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700">{screen.layout}</span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-400">Sync: {screen.lastSync}</span>
              <button type="button" aria-label={`Eliminar ${screen.name}`} onClick={() => deleteScreen(type, screen.id)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100">
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
