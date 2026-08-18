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
  xiboDisplays: async () => {
    const data = await apiRequest<{ displays: XiboDisplay[] }>('/api/xibo/displays');
    return data.displays;
  },
  createSchedule: (payload: Record<string, unknown>) =>
    apiRequest<{ event: unknown }>('/api/xibo/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
