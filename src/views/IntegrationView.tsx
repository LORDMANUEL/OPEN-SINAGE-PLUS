import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Server, Unplug } from 'lucide-react';
import {
  openSignageApi,
  type CreateScheduleInput,
  type XiboDisplay,
  type XiboDisplayGroup,
  type XiboLayout,
  type XiboMedia,
  type XiboPlaylist,
  type XiboSchedule,
} from '../services/openSignageApi';

type LoadState = 'loading' | 'ready' | 'error';
type Tab = 'displays' | 'layouts' | 'media' | 'playlists' | 'schedule';

export default function IntegrationView() {
  const [state, setState] = useState<LoadState>('loading');
  const [gatewayOk, setGatewayOk] = useState(false);
  const [xiboConnected, setXiboConnected] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('displays');
  const [displays, setDisplays] = useState<XiboDisplay[]>([]);
  const [layouts, setLayouts] = useState<XiboLayout[]>([]);
  const [media, setMedia] = useState<XiboMedia[]>([]);
  const [playlists, setPlaylists] = useState<XiboPlaylist[]>([]);
  const [displayGroups, setDisplayGroups] = useState<XiboDisplayGroup[]>([]);
  const [schedules, setSchedules] = useState<XiboSchedule[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ layoutId: '', displayGroupId: '', eventName: '', fromDt: '', toDt: '' });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      await openSignageApi.health();
      setGatewayOk(true);
      const status = await openSignageApi.xiboStatus();
      setXiboConnected(status.connected);
      if (!status.connected) {
        setError(status.error || 'Xibo aún no está configurado.');
        setState('ready');
        return;
      }

      const [nextDisplays, nextLayouts, nextMedia, nextPlaylists, nextGroups, nextSchedules] = await Promise.all([
        openSignageApi.xiboDisplays(),
        openSignageApi.xiboLayouts(),
        openSignageApi.xiboLibrary(),
        openSignageApi.xiboPlaylists(),
        openSignageApi.xiboDisplayGroups(),
        openSignageApi.xiboSchedules(),
      ]);
      setDisplays(nextDisplays);
      setLayouts(nextLayouts);
      setMedia(nextMedia);
      setPlaylists(nextPlaylists);
      setDisplayGroups(nextGroups);
      setSchedules(nextSchedules);
      setState('ready');
    } catch (err) {
      setGatewayOk(false);
      setXiboConnected(false);
      setError(err instanceof Error ? err.message : 'No se pudo validar la integración');
      setState('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const tabs = useMemo(() => [
    { id: 'displays' as const, label: 'Pantallas', count: displays.length },
    { id: 'layouts' as const, label: 'Layouts', count: layouts.length },
    { id: 'media' as const, label: 'Biblioteca', count: media.length },
    { id: 'playlists' as const, label: 'Playlists', count: playlists.length },
    { id: 'schedule' as const, label: 'Programación', count: schedules.length },
  ], [displays.length, layouts.length, media.length, playlists.length, schedules.length]);

  const publish = async (layoutId?: number) => {
    if (!layoutId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await openSignageApi.publishLayout(layoutId);
      setMessage(`Layout ${layoutId} publicado correctamente en Xibo.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el layout');
    } finally {
      setSaving(false);
    }
  };

  const createSchedule = async () => {
    const layoutId = Number(scheduleForm.layoutId);
    const displayGroupId = Number(scheduleForm.displayGroupId);
    if (!layoutId || !displayGroupId) {
      setError('Selecciona un layout y un grupo de pantallas.');
      return;
    }

    const payload: CreateScheduleInput = {
      layoutId,
      eventTypeId: 1,
      displayGroupIds: [displayGroupId],
      eventName: scheduleForm.eventName || `Open Signage - Layout ${layoutId}`,
      fromDt: scheduleForm.fromDt || undefined,
      toDt: scheduleForm.toDt || undefined,
    };

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await openSignageApi.createSchedule(payload);
      setMessage('Programación creada en Xibo. Los players recibirán el cambio por el mecanismo normal de Xibo.');
      setScheduleForm({ layoutId: '', displayGroupId: '', eventName: '', fromDt: '', toDt: '' });
      setSchedules(await openSignageApi.xiboSchedules());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la programación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="xibo-workspace">
      <div className="xibo-workspace__header">
        <div>
          <span className="eyebrow">OPEN SIGNAGE PLUS V2</span>
          <h1>Motor Xibo</h1>
          <p>Administra el motor de señalización desde nuestra PWA. Las credenciales OAuth permanecen exclusivamente en el servidor.</p>
        </div>
        <button className="button button--dark" type="button" onClick={() => void refresh()} disabled={state === 'loading'}>
          <RefreshCw size={18} className={state === 'loading' ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="status-grid">
        <StatusCard title="Open Signage API" ok={gatewayOk} loading={state === 'loading'} detail={gatewayOk ? 'Gateway operativo' : 'Sin respuesta'} icon="api" />
        <StatusCard title="Xibo CMS" ok={xiboConnected} loading={state === 'loading'} detail={xiboConnected ? 'OAuth2 conectado' : 'Pendiente de configurar'} icon="xibo" />
      </div>

      {error && <div className="notice notice--error">{error}</div>}
      {message && <div className="notice notice--success">{message}</div>}

      <div className="resource-summary">
        {tabs.map(item => (
          <button key={item.id} type="button" className={`resource-tab ${tab === item.id ? 'resource-tab--active' : ''}`} onClick={() => setTab(item.id)}>
            <strong>{item.count}</strong><span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="workspace-panel">
        {tab === 'displays' && <ResourceTable title="Pantallas registradas" empty="No hay pantallas registradas en Xibo." rows={displays.map((item, index) => ({ id: item.displayId ?? index, name: String(item.display ?? 'Display sin nombre'), meta: `ID ${item.displayId ?? '—'} · ${item.loggedIn ? 'online' : 'registrado'}` }))} />}

        {tab === 'layouts' && (
          <div>
            <PanelTitle title="Layouts" subtitle="Publica cambios sin abrir la interfaz nativa de Xibo." />
            <div className="resource-list">
              {layouts.length === 0 && <EmptyState text="No hay layouts disponibles." />}
              {layouts.map((layout, index) => (
                <div className="resource-row" key={String(layout.layoutId ?? index)}>
                  <div><strong>{String(layout.layout ?? `Layout ${layout.layoutId ?? index + 1}`)}</strong><small>ID {String(layout.layoutId ?? '—')} · duración {String(layout.duration ?? '—')}s</small></div>
                  <button className="button button--primary" type="button" disabled={saving || !layout.layoutId} onClick={() => void publish(layout.layoutId)}>Publicar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'media' && <ResourceTable title="Biblioteca multimedia" empty="La biblioteca de Xibo está vacía." rows={media.map((item, index) => ({ id: item.mediaId ?? index, name: String(item.name ?? `Media ${item.mediaId ?? index + 1}`), meta: `${String(item.mediaType ?? 'archivo')} · ${formatBytes(item.fileSize)}` }))} />}
        {tab === 'playlists' && <ResourceTable title="Playlists" empty="No hay playlists." rows={playlists.map((item, index) => ({ id: item.playlistId ?? index, name: String(item.name ?? `Playlist ${item.playlistId ?? index + 1}`), meta: `ID ${String(item.playlistId ?? '—')} · ${String(item.duration ?? '—')}s` }))} />}

        {tab === 'schedule' && (
          <div className="schedule-grid">
            <div>
              <PanelTitle title="Nueva programación" subtitle="Publica un layout a un grupo de pantallas usando la API de Xibo." />
              <div className="form-grid">
                <label>Nombre del evento<input value={scheduleForm.eventName} onChange={event => setScheduleForm(form => ({ ...form, eventName: event.target.value }))} placeholder="Promoción agosto" /></label>
                <label>Layout<select value={scheduleForm.layoutId} onChange={event => setScheduleForm(form => ({ ...form, layoutId: event.target.value }))}><option value="">Seleccionar…</option>{layouts.map(layout => <option key={String(layout.layoutId)} value={String(layout.layoutId)}>{String(layout.layout ?? layout.layoutId)}</option>)}</select></label>
                <label>Grupo de pantallas<select value={scheduleForm.displayGroupId} onChange={event => setScheduleForm(form => ({ ...form, displayGroupId: event.target.value }))}><option value="">Seleccionar…</option>{displayGroups.map(group => <option key={String(group.displayGroupId)} value={String(group.displayGroupId)}>{String(group.displayGroup ?? group.displayGroupId)}</option>)}</select></label>
                <label>Desde (opcional)<input type="datetime-local" value={scheduleForm.fromDt} onChange={event => setScheduleForm(form => ({ ...form, fromDt: event.target.value }))} /></label>
                <label>Hasta (opcional)<input type="datetime-local" value={scheduleForm.toDt} onChange={event => setScheduleForm(form => ({ ...form, toDt: event.target.value }))} /></label>
                <button className="button button--primary button--wide" type="button" disabled={saving || !xiboConnected} onClick={() => void createSchedule()}>{saving ? 'Publicando…' : 'Crear programación'}</button>
              </div>
            </div>
            <ResourceTable title="Eventos en Xibo" empty="No hay eventos en la agenda." rows={schedules.map((item, index) => ({ id: item.eventId ?? index, name: String(item.eventName ?? `Evento ${item.eventId ?? index + 1}`), meta: `ID ${String(item.eventId ?? '—')}` }))} />
          </div>
        )}
      </div>
    </section>
  );
}

function StatusCard({ title, ok, loading, detail, icon }: { title: string; ok: boolean; loading: boolean; detail: string; icon: 'api' | 'xibo' }) {
  return <div className="status-card"><div className={`status-card__icon ${ok ? 'status-card__icon--ok' : ''}`}>{icon === 'api' ? <Server size={22} /> : ok ? <CheckCircle2 size={22} /> : <Unplug size={22} />}</div><div><small>{title}</small><strong>{loading ? 'Verificando…' : ok ? 'Conectado' : 'Sin conexión'}</strong><span>{detail}</span></div></div>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-title"><h2>{title}</h2><p>{subtitle}</p></div>;
}

function ResourceTable({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string | number; name: string; meta: string }> }) {
  return <div><PanelTitle title={title} subtitle={`${rows.length} elementos leídos desde Xibo`} /><div className="resource-list">{rows.length === 0 ? <EmptyState text={empty} /> : rows.map(row => <div className="resource-row" key={String(row.id)}><div><strong>{row.name}</strong><small>{row.meta}</small></div></div>)}</div></div>;
}

function EmptyState({ text }: { text: string }) { return <div className="empty-state">{text}</div>; }

function formatBytes(value?: number) {
  if (!value || value < 1) return 'tamaño no informado';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
