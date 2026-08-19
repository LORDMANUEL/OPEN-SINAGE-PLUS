import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BookOpenCheck, Palette, QrCode, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { openSignageApi, type AuditEvent, type Campaign, type DynamicQr, type FleetHealth, type PlatformSetting, type PlatformUser, type SystemHealth, type UserRole } from '../services/openSignageApi';
import { useAppContext } from '../context/app-context';

type Tab = 'health' | 'campaigns' | 'users' | 'audit' | 'brand' | 'qr';

export default function OperationsView() {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === 'admin';
  const canManageCampaigns = isAdmin || currentUser?.role === 'marketing';
  const [tab, setTab] = useState<Tab>('health');
  const tabs = useMemo(() => [
    { id: 'health' as const, label: 'Salud', icon: Activity, show: true },
    { id: 'campaigns' as const, label: 'Campañas', icon: BookOpenCheck, show: true },
    { id: 'users' as const, label: 'Usuarios', icon: Users, show: isAdmin },
    { id: 'audit' as const, label: 'Auditoría', icon: ShieldCheck, show: isAdmin },
    { id: 'brand' as const, label: 'Marca', icon: Palette, show: isAdmin },
    { id: 'qr' as const, label: 'QR dinámico', icon: QrCode, show: isAdmin || currentUser?.role === 'marketing' },
  ].filter(item => item.show), [currentUser?.role, isAdmin]);

  return <section>
    <header className="section-header"><div><span className="eyebrow">PRODUCCIÓN</span><h2>Centro de Operaciones</h2><p>Usuarios, campañas, auditoría, marca, QR y salud de toda la flota desde una sola consola.</p></div></header>
    <div className="inline-actions" style={{ marginBottom: 18 }}>{tabs.map(item => <button key={item.id} className={`button ${tab === item.id ? 'button--primary' : 'button--dark'}`} type="button" onClick={() => setTab(item.id)}><item.icon size={16}/>{item.label}</button>)}</div>
    {tab === 'health' && <HealthPanel />}
    {tab === 'campaigns' && <CampaignPanel canManage={canManageCampaigns} />}
    {tab === 'users' && isAdmin && <UsersPanel />}
    {tab === 'audit' && isAdmin && <AuditPanel />}
    {tab === 'brand' && isAdmin && <BrandPanel />}
    {tab === 'qr' && <QrPanel />}
  </section>;
}

function HealthPanel() {
  const [system, setSystem] = useState<SystemHealth | null>(null);
  const [fleet, setFleet] = useState<FleetHealth | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { const [nextSystem, nextFleet] = await Promise.all([openSignageApi.systemHealth(), openSignageApi.fleetHealth()]); setSystem(nextSystem); setFleet(nextFleet); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar salud'); }
  }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 15000); return () => window.clearInterval(timer); }, [refresh]);
  return <div className="workspace-panel">
    <div className="panel-title"><h2><Activity size={20}/> Salud de plataforma</h2><button className="button button--dark" onClick={() => void refresh()}><RefreshCw size={15}/> Actualizar</button></div>
    {error && <div className="notice notice--error">{error}</div>}
    <div className="queue-summary">
      <Metric label="Pantallas online" value={`${fleet?.online ?? 0}/${fleet?.total ?? 0}`} hint={`${fleet?.offline ?? 0} offline`} />
      <Metric label="Errores player" value={String(fleet?.errors ?? 0)} hint="reportados por heartbeat" />
      <Metric label="Xibo" value={system?.xibo.ok ? 'OK' : 'OFF'} hint={system?.xibo.error || 'conectado'} />
      <Metric label="IA" value={system?.ai.configured ? 'ON' : 'OFF'} hint={system?.ai.model || 'sin configurar'} />
    </div>
    <div className="resource-list">{fleet?.devices.map(device => <div className="resource-row" key={device.deviceToken}><div><strong>{device.name || device.pairingCode} · {device.online ? 'online' : 'offline'}</strong><small>{device.resolution || 'sin resolución'} · {device.appVersion || 'sin versión'} · {device.lastSeenAt || 'sin heartbeat'}</small></div><span>{device.lastError || device.currentSceneToken || 'OK'}</span></div>)}</div>
  </div>;
}

function CampaignPanel({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => { try { setItems(await openSignageApi.campaigns()); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function create() { if (!name.trim() || !canManage) return; try { await openSignageApi.createCampaign(name.trim()); setName(''); setMessage('Campaña creada en borrador.'); await refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error'); } }
  async function status(item: Campaign, next: Campaign['status']) { if (!canManage) return; try { await openSignageApi.setCampaignStatus(item.id, next); await refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error'); } }
  return <div className="workspace-panel">
    <div className="panel-title"><h2>Campañas y aprobación</h2><p>Draft → review → approved → published con historial de versiones.</p></div>
    {canManage ? <div className="form-grid"><label>Nueva campaña<input value={name} onChange={e => setName(e.target.value)} placeholder="Promoción Septiembre"/></label><div className="inline-actions"><button className="button button--primary" onClick={() => void create()}>Crear</button></div></div> : <div className="notice">Modo lectura: este rol puede consultar campañas, pero no cambiar su estado.</div>}
    {message && <div className="notice notice--success">{message}</div>}
    <div className="resource-list">{items.map(item => <div className="resource-row" key={item.id}><div><strong>{item.name} · {item.status}</strong><small>Actualizada {new Date(item.updatedAt).toLocaleString()}</small></div>{canManage && <div className="inline-actions">{item.status === 'draft' && <button className="button button--dark" onClick={() => void status(item, 'review')}>Enviar a revisión</button>}{item.status === 'review' && <button className="button button--primary" onClick={() => void status(item, 'approved')}>Aprobar</button>}{item.status === 'approved' && <button className="button button--primary" onClick={() => void status(item, 'published')}>Publicar</button>}</div>}</div>)}</div>
  </div>;
}

function UsersPanel() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => { try { setUsers(await openSignageApi.platformUsers()); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function create() { try { await openSignageApi.createPlatformUser({ email, name, password, role }); setEmail(''); setName(''); setPassword(''); setMessage('Usuario creado.'); await refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error'); } }
  return <div className="workspace-panel"><div className="panel-title"><h2><Users size={20}/> Usuarios y roles</h2><p>Admin, marketing, operador y visualizador con permisos de servidor.</p></div>
    <div className="form-grid"><label>Nombre<input value={name} onChange={e => setName(e.target.value)}/></label><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)}/></label><label>Rol<select value={role} onChange={e => setRole(e.target.value as UserRole)}><option value="viewer">Viewer</option><option value="operator">Operator</option><option value="marketing">Marketing</option><option value="admin">Admin</option></select></label><label>Contraseña inicial<input type="password" value={password} onChange={e => setPassword(e.target.value)}/></label><div className="inline-actions"><button className="button button--primary" onClick={() => void create()}>Crear usuario</button></div></div>
    {message && <div className="notice notice--success">{message}</div>}
    <div className="resource-list">{users.map(user => <div className="resource-row" key={user.id}><div><strong>{user.name} · {user.role}</strong><small>{user.email} · {user.active ? 'activo' : 'bloqueado'} · último login {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'nunca'}</small></div><button className="button button--dark" onClick={() => void openSignageApi.updatePlatformUser(user.id, { active: !user.active }).then(refresh)}>{user.active ? 'Bloquear' : 'Activar'}</button></div>)}</div>
  </div>;
}

function AuditPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  useEffect(() => { void openSignageApi.auditEvents(250).then(setEvents); }, []);
  return <div className="workspace-panel"><div className="panel-title"><h2><ShieldCheck size={20}/> Auditoría</h2><p>Quién hizo qué, sobre qué objeto, desde qué IP y cuándo.</p></div><div className="resource-list">{events.map(event => <div className="resource-row" key={event.id}><div><strong>{event.action}</strong><small>{event.actorEmail || 'sistema'} · {event.resourceType || 'general'} {event.resourceId || ''}</small></div><span>{new Date(event.at).toLocaleString()}</span></div>)}</div></div>;
}

function BrandPanel() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState('#2166f3');
  const [tone, setTone] = useState('moderno, claro y profesional');
  const [message, setMessage] = useState('');
  useEffect(() => { void openSignageApi.settings('brand.').then(rows => { setSettings(rows); const map = Object.fromEntries(rows.map(row => [row.key, row.value])); if (typeof map['brand.name'] === 'string') setName(map['brand.name']); if (typeof map['brand.primary'] === 'string') setPrimary(map['brand.primary']); if (typeof map['brand.tone'] === 'string') setTone(map['brand.tone']); }); }, []);
  async function save() { await Promise.all([openSignageApi.setSetting('brand.name', name), openSignageApi.setSetting('brand.primary', primary), openSignageApi.setSetting('brand.tone', tone)]); setSettings(await openSignageApi.settings('brand.')); setMessage('Brand kit guardado.'); }
  return <div className="workspace-panel"><div className="panel-title"><h2><Palette size={20}/> Brand Kit</h2><p>Contexto central para Studio, plantillas e IA.</p></div><div className="form-grid"><label>Marca<input value={name} onChange={e => setName(e.target.value)}/></label><label>Color primario<input value={primary} onChange={e => setPrimary(e.target.value)}/></label><label>Tono<input value={tone} onChange={e => setTone(e.target.value)}/></label><div className="inline-actions"><button className="button button--primary" onClick={() => void save()}>Guardar</button></div></div>{message && <div className="notice notice--success">{message}</div>}<small>{settings.length} valores de marca configurados.</small></div>;
}

function QrPanel() {
  const [items, setItems] = useState<DynamicQr[]>([]);
  const [slug, setSlug] = useState('');
  const [destination, setDestination] = useState('https://');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => { try { setItems(await openSignageApi.dynamicQr()); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error'); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function create() { try { await openSignageApi.createDynamicQr(slug, destination); setSlug(''); setMessage('QR dinámico creado.'); await refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Error'); } }
  return <div className="workspace-panel"><div className="panel-title"><h2><QrCode size={20}/> QR dinámico</h2><p>Cambia destino sin volver a diseñar la pantalla y mide escaneos.</p></div><div className="form-grid"><label>Slug<input value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} placeholder="promo-agosto"/></label><label>Destino<input value={destination} onChange={e => setDestination(e.target.value)}/></label><div className="inline-actions"><button className="button button--primary" onClick={() => void create()}>Crear</button></div></div>{message && <div className="notice notice--success">{message}</div>}<div className="resource-list">{items.map(item => <div className="resource-row" key={item.id}><div><strong>/{item.slug} · {item.scanCount} scans</strong><small>{item.destination}</small></div><code>{openSignageApi.dynamicQrUrl(item.slug)}</code></div>)}</div></div>;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
