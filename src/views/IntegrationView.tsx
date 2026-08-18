import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, RefreshCw, Server, Unplug, Monitor } from 'lucide-react';
import { openSignageApi, type XiboDisplay } from '../services/openSignageApi';

type LoadState = 'loading' | 'ready' | 'error';

export default function IntegrationView() {
  const [state, setState] = useState<LoadState>('loading');
  const [gatewayOk, setGatewayOk] = useState(false);
  const [xiboConnected, setXiboConnected] = useState(false);
  const [displays, setDisplays] = useState<XiboDisplay[]>([]);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      await openSignageApi.health();
      setGatewayOk(true);
      const status = await openSignageApi.xiboStatus();
      setXiboConnected(status.connected);
      const items = status.connected ? await openSignageApi.xiboDisplays() : [];
      setDisplays(items);
      setState('ready');
    } catch (err) {
      setGatewayOk(false);
      setXiboConnected(false);
      setDisplays([]);
      setError(err instanceof Error ? err.message : 'No se pudo validar la integración');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">Open Signage Plus V2</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Motor Xibo</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Open Signage mantiene las credenciales de Xibo en el servidor y presenta una experiencia guiada sin exponer el CMS nativo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={state === 'loading'}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          <RefreshCw size={18} className={state === 'loading' ? 'animate-spin' : ''} />
          Verificar conexión
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatusCard
          title="Open Signage API"
          ok={gatewayOk}
          loading={state === 'loading'}
          icon={<Server size={22} />}
          detail={gatewayOk ? 'Gateway disponible' : 'Gateway no disponible'}
        />
        <StatusCard
          title="Xibo CMS"
          ok={xiboConnected}
          loading={state === 'loading'}
          icon={xiboConnected ? <CheckCircle2 size={22} /> : <Unplug size={22} />}
          detail={xiboConnected ? 'OAuth2 validado' : 'Pendiente de conexión'}
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Displays registrados en Xibo</h2>
            <p className="text-sm text-slate-500">Leídos en tiempo real desde la API de Xibo.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{displays.length}</span>
        </div>

        {displays.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Monitor className="mx-auto mb-3" size={34} />
            {state === 'loading' ? 'Consultando displays…' : 'No hay displays disponibles o Xibo aún no está conectado.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displays.map((display, index) => (
              <div key={String(display.displayId ?? index)} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{String(display.display ?? `Display ${display.displayId ?? index + 1}`)}</p>
                  <p className="text-sm text-slate-500">ID {String(display.displayId ?? '—')}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Registrado</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusCard({ title, ok, loading, icon, detail }: { title: string; ok: boolean; loading: boolean; icon: ReactNode; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-xl font-bold text-slate-900">{loading ? 'Verificando…' : ok ? 'Conectado' : 'Sin conexión'}</p>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-3 ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{icon}</div>
      </div>
    </div>
  );
}
