import { useCallback, useEffect, useState } from 'react';
import { Activity, BellRing, CalendarDays, RefreshCw } from 'lucide-react';
import { openSignageApi, type XiboDisplayGroup, type XiboSchedule } from '../services/openSignageApi';
import { adminPlatformApi, type AnalyticsSummary, type NotificationStatus, type SchedulePreview } from '../services/adminPlatformApi';

type Tab = 'schedule' | 'analytics' | 'notifications';

export default function PlanningAnalyticsView() {
  const [tab, setTab] = useState<Tab>('schedule');
  return <section>
    <header className="section-header"><div><span className="eyebrow">PLANIFICACIÓN Y MEDICIÓN</span><h2>Planning Center</h2><p>Previsualiza programación, detecta conflictos, mide Proof of Play y prueba alertas operativas.</p></div></header>
    <div className="inline-actions" style={{ marginBottom: 18 }}><button className={`button ${tab === 'schedule' ? 'button--primary' : 'button--dark'}`} onClick={() => setTab('schedule')}><CalendarDays size={16}/> Calendario</button><button className={`button ${tab === 'analytics' ? 'button--primary' : 'button--dark'}`} onClick={() => setTab('analytics')}><Activity size={16}/> Analytics</button><button className={`button ${tab === 'notifications' ? 'button--primary' : 'button--dark'}`} onClick={() => setTab('notifications')}><BellRing size={16}/> Alertas</button></div>
    {tab === 'schedule' && <SchedulePanel/>}{tab === 'analytics' && <AnalyticsPanel/>}{tab === 'notifications' && <NotificationsPanel/>}
  </section>;
}

function SchedulePanel() {
  const [groups, setGroups] = useState<XiboDisplayGroup[]>([]);
  const [events, setEvents] = useState<XiboSchedule[]>([]);
  const [groupId, setGroupId] = useState('');
  const [at, setAt] = useState(() => toLocalInput(new Date()));
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    try { const [nextGroups, nextEvents] = await Promise.all([openSignageApi.xiboDisplayGroups(), openSignageApi.xiboSchedules()]); setGroups(nextGroups); setEvents(nextEvents); if (!groupId && nextGroups[0]?.displayGroupId) setGroupId(String(nextGroups[0].displayGroupId)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar programación'); }
  }, [groupId]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function inspect() {
    try { setPreview(await adminPlatformApi.schedulePreview(new Date(at).toISOString(), groupId ? Number(groupId) : undefined)); setMessage(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo previsualizar'); }
  }
  return <div className="studio-grid">
    <div className="workspace-panel form-grid"><div className="panel-title"><h2><CalendarDays size={20}/> ¿Qué verá esta pantalla?</h2><p>Consulta un instante antes de publicar o modificar campañas.</p></div><label>Fecha y hora<input aria-label="Fecha y hora de preview" type="datetime-local" value={at} onChange={e => setAt(e.target.value)}/></label><label>Grupo de pantallas<select value={groupId} onChange={e => setGroupId(e.target.value)}><option value="">Todos</option>{groups.map(group => <option key={String(group.displayGroupId)} value={String(group.displayGroupId)}>{group.displayGroup || `Grupo ${group.displayGroupId}`}</option>)}</select></label><button className="button button--primary" onClick={() => void inspect()}>Previsualizar</button>{message && <div className="notice notice--error">{message}</div>}{preview && <div className={preview.conflict ? 'notice notice--error' : 'notice notice--success'}><strong>{preview.conflict ? 'Conflicto detectado' : 'Programación consistente'}</strong><div>{preview.winner ? `Ganador: ${preview.winner.eventName || preview.winner.eventId} · layout ${preview.winner.layoutId ?? '—'}` : 'No hay evento activo en ese instante.'}</div><small>{preview.matches.length} eventos coinciden.</small></div>}</div>
    <div className="workspace-panel"><div className="panel-title"><h2>Agenda Xibo</h2><button className="button button--dark" onClick={() => void refresh()}><RefreshCw size={15}/> Actualizar</button></div><div className="resource-list">{events.length === 0 ? <div className="empty-state">No hay eventos o Xibo aún no está conectado.</div> : events.slice(0, 100).map((event, index) => <div className="resource-row" key={String(event.eventId ?? index)}><div><strong>{String(event.eventName ?? `Evento ${index + 1}`)}</strong><small>{formatDate(event.fromDt)} → {formatDate(event.toDt)}</small></div><span>ID {String(event.eventId ?? '—')}</span></div>)}</div></div>
  </div>;
}

function AnalyticsPanel() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hours, setHours] = useState(24);
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => { try { setSummary(await adminPlatformApi.analytics(hours)); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar analytics'); } }, [hours]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <div className="workspace-panel"><div className="panel-title"><h2><Activity size={20}/> Proof of Play</h2><div className="inline-actions"><select aria-label="Periodo de analytics" value={hours} onChange={e => setHours(Number(e.target.value))}><option value={24}>24 horas</option><option value={168}>7 días</option><option value={720}>30 días</option></select><button className="button button--dark" onClick={() => void refresh()}><RefreshCw size={15}/> Actualizar</button></div></div>{message && <div className="notice notice--error">{message}</div>}<div className="queue-summary"><Metric label="Reproducciones" value={summary?.playbackCount ?? 0} hint="Proof of Play"/><Metric label="Interacciones" value={summary?.interactionCount ?? 0} hint="touch / QR / acciones"/><Metric label="Escenas" value={summary?.uniqueScenes ?? 0} hint="únicas"/><Metric label="Dispositivos" value={summary?.uniqueDevices ?? 0} hint="con telemetría"/></div>{summary?.actions && <div className="resource-list">{Object.entries(summary.actions).map(([action, value]) => <div className="resource-row" key={action}><strong>{action}</strong><span>{value}</span></div>)}</div>}</div>;
}

function NotificationsPanel() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [subject, setSubject] = useState('Open Signage Plus · prueba');
  const [text, setText] = useState('La plataforma puede enviar alertas correctamente.');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => { try { setStatus(await adminPlatformApi.notificationStatus()); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo leer alertas'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function testNotification() { try { const result = await adminPlatformApi.testNotification(subject, text); setMessage(`Prueba ejecutada: ${result.results.length} canal(es).`); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo enviar prueba'); } }
  return <div className="workspace-panel form-grid"><div className="panel-title"><h2><BellRing size={20}/> Notificaciones operativas</h2><p>El servidor alerta Xibo desconectado, pantallas offline y otros fallos mediante SMTP/Webhook configurados.</p></div><div className="queue-summary"><Metric label="SMTP" value={status?.smtp ? 'ON' : 'OFF'} hint="TLS"/><Metric label="Webhook" value={status?.webhook ? 'ON' : 'OFF'} hint="HTTPS"/></div><label>Asunto<input value={subject} onChange={e => setSubject(e.target.value)}/></label><label>Mensaje<textarea value={text} onChange={e => setText(e.target.value)} rows={4}/></label><button className="button button--primary" onClick={() => void testNotification()}>Enviar prueba</button>{message && <div className="notice notice--success">{message}</div>}</div>;
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function toLocalInput(date: Date) { const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return adjusted.toISOString().slice(0, 16); }
function formatDate(value: unknown) { if (value == null || value === '') return '—'; const date = new Date(typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : value as string | number); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(); }
