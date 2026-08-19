import { useCallback, useEffect, useState } from 'react';
import { Monitor, RefreshCw, Smartphone, LayoutDashboard } from 'lucide-react';
import { openSignageApi } from '../services/openSignageApi';
import type { ScreenType } from '../context/app-context';

interface InventoryRow {
  id: string;
  name: string;
  status: string;
  detail: string;
  meta: string;
}

type Props = { type: ScreenType; title: string };

export default function ScreenListView({ type, title }: Props) {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      if (type === 'signage') {
        const displays = await openSignageApi.xiboDisplays();
        setRows(displays.map((display, index) => ({
          id: String(display.displayId ?? index),
          name: String(display.display ?? `Display ${index + 1}`),
          status: display.loggedIn ? 'online' : 'offline',
          detail: `Xibo display · ID ${String(display.displayId ?? '—')}`,
          meta: display.lastAccessed ? `Último acceso: ${formatDate(display.lastAccessed)}` : 'Sin último acceso reportado',
        })));
      } else if (type === 'kiosk') {
        const devices = await openSignageApi.listDevices();
        setRows(devices.map((device, index) => ({
          id: device.deviceToken || String(index),
          name: device.name || `Browser ${device.pairingCode}`,
          status: device.sceneToken ? 'paired' : 'waiting',
          detail: `Código ${device.pairingCode} · ${device.sceneToken ? 'escena asignada' : 'sin escena'}`,
          meta: device.lastSeenAt ? `Última señal: ${formatDate(device.lastSeenAt)}` : (device.userAgent || 'Browser device'),
        })));
      } else {
        const layouts = await openSignageApi.xiboLayouts();
        setRows(layouts.map((layout, index) => ({
          id: String(layout.layoutId ?? index),
          name: String(layout.layout ?? `Layout ${index + 1}`),
          status: String(layout.status ?? 'draft'),
          detail: `Xibo layout · ID ${String(layout.layoutId ?? '—')}`,
          meta: `Duración: ${Number(layout.duration || 0)} s${layout.retired ? ' · retirado' : ''}`,
        })));
      }
    } catch (error) {
      setRows([]);
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar el inventario real');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { void load(); }, [load]);

  const sourceLabel = type === 'signage' ? 'XIBO DISPLAYS' : type === 'kiosk' ? 'PLUS BROWSER DEVICES' : 'XIBO LAYOUTS';
  const Icon = type === 'signage' ? Monitor : type === 'kiosk' ? Smartphone : LayoutDashboard;

  return (
    <section className="screen-list-view">
      <header className="section-header">
        <div>
          <span className="eyebrow">{sourceLabel}</span>
          <h2>{title}</h2>
          <p>{type === 'kiosk' ? 'Dispositivos registrados desde /screen y persistidos por Open Signage Plus.' : 'Información leída directamente desde el motor Xibo.'}</p>
        </div>
        <button className="button button--dark" type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </header>

      {message && <div className="notice">{message}</div>}
      {loading ? (
        <div className="empty-state">Cargando inventario…</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <Icon size={34} />
          <strong>Sin elementos disponibles</strong>
          <span>{type === 'kiosk' ? 'Abra /screen en una TV o navegador para registrar el primer dispositivo.' : 'Conecte Xibo o cree contenido para comenzar.'}</span>
        </div>
      ) : (
        <div className="screen-grid">
          {rows.map(row => (
            <article className="screen-card" key={row.id}>
              <div className="screen-card__top">
                <span className="screen-card__icon"><Icon size={22} /></span>
                <span className={`status-dot status-dot--${row.status === 'online' || row.status === 'paired' || row.status === '1' ? 'online' : 'offline'}`}>{row.status}</span>
              </div>
              <h3>{row.name}</h3>
              <p>{row.detail}</p>
              <small>{row.meta}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value: unknown) {
  if (typeof value === 'number') return new Date(value * 1000).toLocaleString('es-HN');
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('es-HN');
}
