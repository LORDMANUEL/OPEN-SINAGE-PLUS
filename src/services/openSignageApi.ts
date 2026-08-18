export interface GatewayHealth {
  status: string;
  service: string;
}

export interface XiboStatus {
  connected: boolean;
  error?: string;
}

export interface XiboDisplay {
  displayId?: number;
  display?: string;
  displayGroupId?: number;
  licensed?: number | boolean;
  loggedIn?: number | boolean;
  lastAccessed?: string;
  [key: string]: unknown;
}

export interface XiboLayout {
  layoutId?: number;
  layout?: string;
  status?: number | string;
  duration?: number;
  retired?: number | boolean;
  [key: string]: unknown;
}

export interface XiboMedia {
  mediaId?: number;
  name?: string;
  mediaType?: string;
  duration?: number;
  fileSize?: number;
  [key: string]: unknown;
}

export interface XiboPlaylist {
  playlistId?: number;
  name?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface XiboDisplayGroup {
  displayGroupId?: number;
  displayGroup?: string;
  isDisplaySpecific?: number | boolean;
  [key: string]: unknown;
}

export interface XiboSchedule {
  eventId?: number;
  eventName?: string;
  fromDt?: string | number;
  toDt?: string | number;
  [key: string]: unknown;
}

export interface CreateScheduleInput {
  layoutId: number;
  eventTypeId: number;
  displayGroupIds: number[];
  eventName?: string;
  fromDt?: string;
  toDt?: string;
  dayPartId?: number;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.message === 'string'
      ? payload.message
      : `Open Signage API error ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export const openSignageApi = {
  health: () => apiRequest<GatewayHealth>('/api/health'),
  xiboStatus: () => apiRequest<XiboStatus>('/api/integrations/xibo/status'),
  xiboDisplays: async () => (await apiRequest<{ displays: XiboDisplay[] }>('/api/xibo/displays')).displays,
  xiboLayouts: async () => (await apiRequest<{ layouts: XiboLayout[] }>('/api/xibo/layouts')).layouts,
  xiboLibrary: async () => (await apiRequest<{ media: XiboMedia[] }>('/api/xibo/library')).media,
  xiboPlaylists: async () => (await apiRequest<{ playlists: XiboPlaylist[] }>('/api/xibo/playlists')).playlists,
  xiboDisplayGroups: async () => (await apiRequest<{ displayGroups: XiboDisplayGroup[] }>('/api/xibo/display-groups')).displayGroups,
  xiboSchedules: async () => (await apiRequest<{ schedules: XiboSchedule[] }>('/api/xibo/schedules')).schedules,
  publishLayout: (layoutId: number) => apiRequest<{ layout: unknown }>(`/api/xibo/layouts/${layoutId}/publish`, { method: 'POST' }),
  createSchedule: (payload: CreateScheduleInput) =>
    apiRequest<{ event: unknown }>('/api/xibo/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
