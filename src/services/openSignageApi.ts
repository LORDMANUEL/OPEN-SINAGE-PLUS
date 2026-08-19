export interface GatewayHealth { status: string; service: string }
export interface XiboStatus { connected: boolean; error?: string }
export interface XiboDisplay { displayId?: number; display?: string; displayGroupId?: number; licensed?: number | boolean; loggedIn?: number | boolean; lastAccessed?: string; [key: string]: unknown }
export interface XiboLayout { layoutId?: number; layout?: string; status?: number | string; duration?: number; retired?: number | boolean; [key: string]: unknown }
export interface XiboMedia { mediaId?: number; name?: string; mediaType?: string; duration?: number; fileSize?: number; fileName?: string; thumbnailUrl?: string; [key: string]: unknown }
export interface XiboPlaylist { playlistId?: number; name?: string; duration?: number; [key: string]: unknown }
export interface XiboDisplayGroup { displayGroupId?: number; displayGroup?: string; isDisplaySpecific?: number | boolean; [key: string]: unknown }
export interface XiboSchedule { eventId?: number; eventName?: string; fromDt?: string | number; toDt?: string | number; [key: string]: unknown }
export interface XiboWidget { widgetId?: number; type?: string; [key: string]: unknown }
export interface CreateScheduleInput { layoutId: number; eventTypeId: number; displayGroupIds: number[]; eventName?: string; fromDt?: string; toDt?: string; dayPartId?: number }
export interface CreateLayoutInput { name: string; resolutionId?: number; layoutId?: number; description?: string; code?: string; returnDraft?: boolean }
export type PlayerAction = { type: 'openUrl'; url: string } | { type: 'ticket'; queue: string; prefix?: string };
export type PlayerItem =
  | { id?: string; type: 'text'; text: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number; color?: string; fontSize?: number; align?: 'left' | 'center' | 'right' }
  | { id?: string; type: 'image'; src: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number; fit?: 'cover' | 'contain' | 'fill' }
  | { id?: string; type: 'video'; src: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number; fit?: 'cover' | 'contain' | 'fill'; muted?: boolean; loop?: boolean; autoplay?: boolean }
  | { id?: string; type: 'html'; html: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number }
  | { id?: string; type: 'button'; text: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number; color?: string; background?: string; action: PlayerAction }
  | { id?: string; type: 'qr'; value: string; label?: string; x?: number; y?: number; width?: number; height?: number; zIndex?: number };
export interface PlayerScene { token?: string; name: string; duration?: number; background?: string; items: PlayerItem[]; createdAt?: string; updatedAt?: string }
export interface AiStatus { configured: boolean; provider: string | null; model: string | null }
export interface AiDiagnostics extends AiStatus { fallbackConfigured?: boolean; metrics?: { requests?: number; failures?: number; lastLatencyMs?: number | null; lastError?: string | null; lastSuccessAt?: string | null } }
export interface AiHealth { ok: boolean; configured: boolean; provider?: string | null; model?: string | null; latencyMs?: number; status?: number; error?: string }
export interface Ticket { id: string; queue: string; prefix: string; sequence?: number; number: string; customerName?: string; service?: string; priority?: number; status: 'waiting' | 'called' | 'completed'; desk?: string; waitMs?: number | null; serviceMs?: number | null; createdAt?: string; calledAt?: string; completedAt?: string; updatedAt?: string }
export interface PlayerDevice { deviceToken: string; pairingCode: string; sceneToken: string | null; name?: string; userAgent?: string; createdAt?: string; updatedAt?: string; lastSeenAt?: string; online?: boolean; appVersion?: string; resolution?: string; orientation?: string; storageFreeBytes?: number | null; storageQuotaBytes?: number | null; currentSceneToken?: string | null; lastError?: string }
export type UserRole = 'admin' | 'marketing' | 'operator' | 'viewer';
export interface SessionUser { id?: string; email: string; role: UserRole; name?: string }
export interface LoginResult { token: string; user: SessionUser; expiresAt: number }
export interface PlatformUser extends SessionUser { id: string; active: boolean; createdAt?: string; updatedAt?: string; lastLoginAt?: string | null }
export interface AuditEvent { id: number; at: string; actorEmail?: string; action: string; resourceType?: string; resourceId?: string; ip?: string; detail?: Record<string, unknown> }
export interface CampaignVersion { id: string; campaignId: string; version: number; scene: PlayerScene; createdBy: string; createdAt: string }
export interface Campaign { id: string; name: string; status: 'draft' | 'review' | 'approved' | 'published' | 'expired'; target: Record<string, unknown>; activeVersionId?: string | null; createdBy: string; createdAt: string; updatedAt: string; approvedBy?: string | null; approvedAt?: string | null; publishedAt?: string | null }
export interface PlatformSetting { key: string; value: unknown; updatedAt?: string }
export interface DynamicQr { id: string; slug: string; destination: string; scanCount: number; enabled: boolean; createdAt: string; updatedAt: string }
export interface FleetHealth { total: number; online: number; offline: number; errors: number; devices: PlayerDevice[] }
export interface SystemHealth { status: string; checkedAt: string; latencyMs: number; node: string; uptimeSeconds: number; hostname: string; memory: Record<string, number>; storage: Record<string, number>; xibo: { ok: boolean; error?: string }; ai: AiDiagnostics; fleet: FleetHealth }

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'open-signage-admin-session';

function sessionToken() { return typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) || '' : ''; }
function buildHeaders(init?: RequestInit, jsonBody = false): Headers {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  const token = sessionToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (jsonBody) headers.set('Content-Type', 'application/json');
  return headers;
}
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isJsonBody = typeof init?.body === 'string';
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: buildHeaders(init, isJsonBody) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login' && typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
    const message = typeof payload?.message === 'string' ? payload.message : `Open Signage API error ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}
async function uploadBinary(file: File, name?: string, tags?: string): Promise<XiboMedia[]> {
  const headers = buildHeaders();
  headers.set('Content-Type', file.type || 'application/octet-stream');
  headers.set('X-File-Name', file.name);
  if (name) headers.set('X-Media-Name', name);
  if (tags) headers.set('X-Media-Tags', tags);
  const response = await fetch(`${API_BASE}/api/xibo/library/upload`, { method: 'POST', headers, body: file });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : `Upload error ${response.status}`);
  return Array.isArray(payload.media) ? payload.media as XiboMedia[] : [];
}

export const openSignageApi = {
  login: async (email: string, password: string) => { const result = await apiRequest<LoginResult>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem(SESSION_KEY, result.token); return result; },
  logout: () => localStorage.removeItem(SESSION_KEY),
  hasSession: () => Boolean(sessionToken()),
  session: async () => (await apiRequest<{ user: SessionUser }>('/api/auth/session')).user,
  health: () => apiRequest<GatewayHealth>('/api/health'),
  xiboStatus: () => apiRequest<XiboStatus>('/api/integrations/xibo/status'),
  xiboDisplays: async () => (await apiRequest<{ displays: XiboDisplay[] }>('/api/xibo/displays')).displays,
  xiboLayouts: async () => (await apiRequest<{ layouts: XiboLayout[] }>('/api/xibo/layouts')).layouts,
  xiboLibrary: async () => (await apiRequest<{ media: XiboMedia[] }>('/api/xibo/library')).media,
  xiboPlaylists: async () => (await apiRequest<{ playlists: XiboPlaylist[] }>('/api/xibo/playlists')).playlists,
  xiboDisplayGroups: async () => (await apiRequest<{ displayGroups: XiboDisplayGroup[] }>('/api/xibo/display-groups')).displayGroups,
  xiboSchedules: async () => (await apiRequest<{ schedules: XiboSchedule[] }>('/api/xibo/schedules')).schedules,
  uploadMedia: uploadBinary,
  createLayout: (payload: CreateLayoutInput) => apiRequest<{ layout: XiboLayout }>('/api/xibo/layouts', { method: 'POST', body: JSON.stringify(payload) }),
  createXiboWebpageWidget: (playlistId: number, payload: { uri: string; name?: string; duration?: number }) => apiRequest<{ widget: XiboWidget }>(`/api/xibo/playlists/${playlistId}/webpage`, { method: 'POST', body: JSON.stringify(payload) }),
  publishLayout: (layoutId: number) => apiRequest<{ layout: unknown }>(`/api/xibo/layouts/${layoutId}/publish`, { method: 'POST' }),
  createSchedule: (payload: CreateScheduleInput) => apiRequest<{ event: unknown }>('/api/xibo/schedules', { method: 'POST', body: JSON.stringify(payload) }),
  createPlayerScene: (scene: PlayerScene) => apiRequest<{ token: string; scene: PlayerScene }>('/api/player/scenes', { method: 'POST', body: JSON.stringify(scene) }),
  updatePlayerScene: (token: string, scene: PlayerScene) => apiRequest<{ scene: PlayerScene }>(`/api/player/scenes/${encodeURIComponent(token)}`, { method: 'PUT', body: JSON.stringify(scene) }),
  getPlayerScene: async (token: string) => (await apiRequest<{ scene: PlayerScene }>(`/api/player/scenes/${encodeURIComponent(token)}`)).scene,
  registerDevice: async () => (await apiRequest<{ device: PlayerDevice }>('/api/player/devices/register', { method: 'POST', body: '{}' })).device,
  listDevices: async () => (await apiRequest<{ devices: PlayerDevice[] }>('/api/player/devices')).devices,
  getDevice: async (deviceToken: string) => (await apiRequest<{ device: PlayerDevice }>(`/api/player/devices/${encodeURIComponent(deviceToken)}`)).device,
  pairDevice: async (pairingCode: string, sceneToken: string, name = '') => (await apiRequest<{ device: PlayerDevice }>('/api/player/devices/pair', { method: 'POST', body: JSON.stringify({ pairingCode, sceneToken, name }) })).device,
  heartbeatDevice: async (deviceToken: string, metadata: Partial<PlayerDevice>) => (await apiRequest<{ device: PlayerDevice }>(`/api/player/devices/${encodeURIComponent(deviceToken)}/heartbeat`, { method: 'POST', body: JSON.stringify(metadata) })).device,
  fleetHealth: () => apiRequest<FleetHealth>('/api/platform/fleet/health'),
  systemHealth: () => apiRequest<SystemHealth>('/api/platform/system/health'),
  platformUsers: async () => (await apiRequest<{ users: PlatformUser[] }>('/api/platform/users')).users,
  createPlatformUser: async (payload: { email: string; name?: string; role: UserRole; password: string }) => (await apiRequest<{ user: PlatformUser }>('/api/platform/users', { method: 'POST', body: JSON.stringify(payload) })).user,
  updatePlatformUser: async (id: string, payload: Partial<Pick<PlatformUser, 'name' | 'role' | 'active'>>) => (await apiRequest<{ user: PlatformUser }>(`/api/platform/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) })).user,
  auditEvents: async (limit = 100) => (await apiRequest<{ events: AuditEvent[] }>(`/api/platform/audit?limit=${limit}`)).events,
  settings: async (prefix = '') => (await apiRequest<{ settings: PlatformSetting[] }>(`/api/platform/settings?prefix=${encodeURIComponent(prefix)}`)).settings,
  setSetting: async (key: string, value: unknown) => (await apiRequest<{ key: string; value: unknown }>(`/api/platform/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value }) })).value,
  campaigns: async () => (await apiRequest<{ campaigns: Campaign[] }>('/api/platform/campaigns')).campaigns,
  createCampaign: async (name: string, target: Record<string, unknown> = {}) => (await apiRequest<{ campaign: Campaign }>('/api/platform/campaigns', { method: 'POST', body: JSON.stringify({ name, target }) })).campaign,
  campaign: (id: string) => apiRequest<{ campaign: Campaign; versions: CampaignVersion[] }>(`/api/platform/campaigns/${encodeURIComponent(id)}`),
  addCampaignVersion: async (id: string, scene: PlayerScene) => (await apiRequest<{ version: CampaignVersion }>(`/api/platform/campaigns/${encodeURIComponent(id)}/versions`, { method: 'POST', body: JSON.stringify({ scene }) })).version,
  setCampaignStatus: async (id: string, status: Campaign['status']) => (await apiRequest<{ campaign: Campaign }>(`/api/platform/campaigns/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) })).campaign,
  rollbackCampaign: async (id: string, versionId: string) => (await apiRequest<{ campaign: Campaign }>(`/api/platform/campaigns/${encodeURIComponent(id)}/rollback`, { method: 'POST', body: JSON.stringify({ versionId }) })).campaign,
  dynamicQr: async () => (await apiRequest<{ qr: DynamicQr[] }>('/api/platform/qr')).qr,
  createDynamicQr: async (slug: string, destination: string) => (await apiRequest<{ qr: DynamicQr }>('/api/platform/qr', { method: 'POST', body: JSON.stringify({ slug, destination }) })).qr,
  aiStatus: () => apiRequest<AiStatus>('/api/ai/status'),
  aiHealth: () => apiRequest<{ health: AiHealth; diagnostics: AiDiagnostics }>('/api/ai/health'),
  generateScene: async (prompt: string) => (await apiRequest<{ scene: PlayerScene }>('/api/ai/generate-scene', { method: 'POST', body: JSON.stringify({ prompt }) })).scene,
  reviseScene: async (scene: PlayerScene, instruction: string) => (await apiRequest<{ scene: PlayerScene }>('/api/ai/revise-scene', { method: 'POST', body: JSON.stringify({ scene, instruction }) })).scene,
  qrUrl: (value: string) => `${API_BASE}/api/qr?value=${encodeURIComponent(value)}`,
  dynamicQrUrl: (slug: string) => `${window.location.origin}/q/${encodeURIComponent(slug)}`,
  issueTicket: async (queue: string, prefix = 'A', customerName = '', service = '', priority = 0) => (await apiRequest<{ ticket: Ticket }>(`/api/queues/${encodeURIComponent(queue)}/tickets`, { method: 'POST', body: JSON.stringify({ prefix, customerName, service, priority }) })).ticket,
  listTickets: async (queue: string) => (await apiRequest<{ tickets: Ticket[] }>(`/api/queues/${encodeURIComponent(queue)}`)).tickets,
  callNextTicket: async (queue: string, desk: string) => (await apiRequest<{ ticket: Ticket }>(`/api/queues/${encodeURIComponent(queue)}/call-next`, { method: 'POST', body: JSON.stringify({ desk }) })).ticket,
  completeTicket: async (queue: string, ticketId: string) => (await apiRequest<{ ticket: Ticket }>(`/api/queues/${encodeURIComponent(queue)}/tickets/${encodeURIComponent(ticketId)}/complete`, { method: 'POST' })).ticket,
};
