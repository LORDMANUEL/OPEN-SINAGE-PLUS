export interface GatewayHealth { status: string; service: string }
export interface XiboStatus { connected: boolean; error?: string }
export interface XiboDisplay { displayId?: number; display?: string; displayGroupId?: number; licensed?: number | boolean; loggedIn?: number | boolean; lastAccessed?: string; [key: string]: unknown }
export interface XiboLayout { layoutId?: number; layout?: string; status?: number | string; duration?: number; retired?: number | boolean; [key: string]: unknown }
export interface XiboMedia { mediaId?: number; name?: string; mediaType?: string; duration?: number; fileSize?: number; fileName?: string; thumbnailUrl?: string; [key: string]: unknown }
export interface XiboPlaylist { playlistId?: number; name?: string; duration?: number; [key: string]: unknown }
export interface XiboDisplayGroup { displayGroupId?: number; displayGroup?: string; isDisplaySpecific?: number | boolean; [key: string]: unknown }
export interface XiboSchedule { eventId?: number; eventName?: string; fromDt?: string | number; toDt?: string | number; [key: string]: unknown }
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
export interface Ticket { id: string; queue: string; prefix: string; sequence?: number; number: string; customerName?: string; status: 'waiting' | 'called' | 'completed'; desk?: string; createdAt?: string; calledAt?: string; completedAt?: string; updatedAt?: string }
export interface PlayerDevice { deviceToken: string; pairingCode: string; sceneToken: string | null; name?: string; userAgent?: string; createdAt?: string; updatedAt?: string; lastSeenAt?: string }
export interface SessionUser { email: string; role: 'admin'; name?: string }
export interface LoginResult { token: string; user: SessionUser; expiresAt: number }

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'open-signage-admin-session';

function sessionToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) || '' : '';
}

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
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: buildHeaders(init, isJsonBody),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
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

  const response = await fetch(`${API_BASE}/api/xibo/library/upload`, {
    method: 'POST',
    headers,
    body: file,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : `Upload error ${response.status}`);
  return Array.isArray(payload.media) ? payload.media as XiboMedia[] : [];
}

export const openSignageApi = {
  login: async (email: string, password: string) => {
    const result = await apiRequest<LoginResult>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem(SESSION_KEY, result.token);
    return result;
  },
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
  publishLayout: (layoutId: number) => apiRequest<{ layout: unknown }>(`/api/xibo/layouts/${layoutId}/publish`, { method: 'POST' }),
  createSchedule: (payload: CreateScheduleInput) => apiRequest<{ event: unknown }>('/api/xibo/schedules', { method: 'POST', body: JSON.stringify(payload) }),
  createPlayerScene: (scene: PlayerScene) => apiRequest<{ token: string; scene: PlayerScene }>('/api/player/scenes', { method: 'POST', body: JSON.stringify(scene) }),
  updatePlayerScene: (token: string, scene: PlayerScene) => apiRequest<{ scene: PlayerScene }>(`/api/player/scenes/${encodeURIComponent(token)}`, { method: 'PUT', body: JSON.stringify(scene) }),
  getPlayerScene: async (token: string) => (await apiRequest<{ scene: PlayerScene }>(`/api/player/scenes/${encodeURIComponent(token)}`)).scene,
  registerDevice: async () => (await apiRequest<{ device: PlayerDevice }>('/api/player/devices/register', { method: 'POST', body: '{}' })).device,
  getDevice: async (deviceToken: string) => (await apiRequest<{ device: PlayerDevice }>(`/api/player/devices/${encodeURIComponent(deviceToken)}`)).device,
  pairDevice: async (pairingCode: string, sceneToken: string, name = '') => (await apiRequest<{ device: PlayerDevice }>('/api/player/devices/pair', { method: 'POST', body: JSON.stringify({ pairingCode, sceneToken, name }) })).device,
  aiStatus: () => apiRequest<AiStatus>('/api/ai/status'),
  generateScene: async (prompt: string) => (await apiRequest<{ scene: PlayerScene }>('/api/ai/generate-scene', { method: 'POST', body: JSON.stringify({ prompt }) })).scene,
  qrUrl: (value: string) => `${API_BASE}/api/qr?value=${encodeURIComponent(value)}`,
  issueTicket: async (queue: string, prefix = 'A', customerName = '') => (await apiRequest<{ ticket: Ticket }>(`/api/queues/${encodeURIComponent(queue)}/tickets`, { method: 'POST', body: JSON.stringify({ prefix, customerName }) })).ticket,
  listTickets: async (queue: string) => (await apiRequest<{ tickets: Ticket[] }>(`/api/queues/${encodeURIComponent(queue)}`)).tickets,
  callNextTicket: async (queue: string, desk: string) => (await apiRequest<{ ticket: Ticket }>(`/api/queues/${encodeURIComponent(queue)}/call-next`, { method: 'POST', body: JSON.stringify({ desk }) })).ticket,
  completeTicket: async (queue: string, ticketId: string) => (await apiRequest<{ ticket: Ticket }>(`/api/queues/${encodeURIComponent(queue)}/tickets/${encodeURIComponent(ticketId)}/complete`, { method: 'POST' })).ticket,
};
