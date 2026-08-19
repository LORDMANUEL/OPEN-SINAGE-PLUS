import type { PlayerScene, Ticket, XiboSchedule } from './openSignageApi';

export interface Organization { id: string; name: string; slug: string; createdAt?: string; updatedAt?: string }
export interface Location { id: string; organizationId: string; name: string; code: string; timezone?: string; createdAt?: string; updatedAt?: string }
export interface Membership { id?: string; userEmail: string; organizationId: string; locationId?: string | null; createdAt?: string }
export interface FormField { name: string; label?: string; type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'; required?: boolean; options?: string[] }
export interface FormDefinition { id: string; name: string; schema: { fields?: FormField[]; submitLabel?: string; successMessage?: string }; createdAt: string; updatedAt: string }
export interface FormResponse { id: string; formId: string; response: Record<string, unknown>; createdAt: string }
export interface SchedulePreview { at: string; displayGroupId?: number; winner: XiboSchedule | null; matching: XiboSchedule[]; conflicts: Array<{ eventIds: Array<string | number>; reason: string }> }
export interface AnalyticsSummary { sinceHours: number; playbackCount: number; interactionCount: number; uniqueScenes?: number; uniqueDevices?: number; actions?: Record<string, number>; [key: string]: unknown }
export interface MediaCatalogItem { id: string; fileName: string; displayName?: string; contentType?: string; tags?: string; sha256: string; bytes?: number; useCount?: number; lastUsedAt?: string; createdAt?: string; xiboPayload?: Record<string, unknown> }
export interface QueueStats { total: number; waiting: number; called: number; completed: number; averageWaitMs?: number; averageServiceMs?: number; [key: string]: unknown }

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'open-signage-admin-session';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (typeof init?.body === 'string') headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem(SESSION_KEY) || '';
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : `API error ${response.status}`);
  return payload as T;
}

export const adminPlatformApi = {
  organizations: async () => (await request<{ organizations: Organization[] }>('/api/platform/organizations')).organizations,
  createOrganization: async (name: string, slug: string) => (await request<{ organization: Organization }>('/api/platform/organizations', { method: 'POST', body: JSON.stringify({ name, slug }) })).organization,
  locations: async (organizationId = '') => (await request<{ locations: Location[] }>(`/api/platform/organizations/locations${organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''}`)).locations,
  createLocation: async (organizationId: string, name: string, code: string, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) => (await request<{ location: Location }>('/api/platform/organizations/locations', { method: 'POST', body: JSON.stringify({ organizationId, name, code, timezone }) })).location,
  memberships: async () => (await request<{ memberships: Membership[] }>('/api/platform/organizations/memberships/me')).memberships,
  assignMembership: async (payload: Membership) => (await request<{ memberships: Membership[] }>('/api/platform/organizations/memberships', { method: 'POST', body: JSON.stringify(payload) })).memberships,

  forms: async () => (await request<{ forms: FormDefinition[] }>('/api/platform/forms')).forms,
  createForm: async (name: string, schema: FormDefinition['schema']) => (await request<{ form: FormDefinition }>('/api/platform/forms', { method: 'POST', body: JSON.stringify({ name, schema }) })).form,
  formResponses: async (formId: string, limit = 500) => (await request<{ responses: FormResponse[] }>(`/api/platform/forms/${encodeURIComponent(formId)}/responses?limit=${limit}`)).responses,
  publicForm: async (formId: string) => (await request<{ form: FormDefinition }>(`/api/forms/${encodeURIComponent(formId)}`)).form,
  submitPublicForm: async (formId: string, response: Record<string, unknown>) => (await request<{ response: FormResponse }>(`/api/forms/${encodeURIComponent(formId)}/responses`, { method: 'POST', body: JSON.stringify(response) })).response,

  schedulePreview: (at: string, displayGroupId?: number) => request<SchedulePreview>('/api/platform/schedule/preview', { method: 'POST', body: JSON.stringify({ at, displayGroupId }) }),
  analytics: (hours = 24) => request<AnalyticsSummary>(`/api/platform/analytics/summary?hours=${hours}`),
  mediaCatalog: async (q = '', tags = '') => (await request<{ media: MediaCatalogItem[] }>(`/api/platform/media/catalog?q=${encodeURIComponent(q)}&tags=${encodeURIComponent(tags)}`)).media,
  mediaOrphans: async (days = 30) => (await request<{ media: MediaCatalogItem[] }>(`/api/platform/media/orphans?days=${days}`)).media,
  queueStats: async (queue: string) => (await request<{ stats: QueueStats }>(`/api/platform/queues/${encodeURIComponent(queue)}/stats`)).stats,
  transferTicket: async (queue: string, ticketId: string, targetQueue: string, service = '') => (await request<{ ticket: Ticket }>(`/api/platform/queues/${encodeURIComponent(queue)}/tickets/${encodeURIComponent(ticketId)}/transfer`, { method: 'POST', body: JSON.stringify({ targetQueue, service }) })).ticket,
  publicFormUrl: (formId: string) => `${window.location.origin}/form/${encodeURIComponent(formId)}`,
  sceneFromFormThankYou: (name: string): PlayerScene => ({ name, duration: 15, background: '#071426', items: [{ type: 'text', text: '¡Gracias!', x: 10, y: 30, width: 80, height: 30, color: '#fff', fontSize: 64, align: 'center' }] }),
};
