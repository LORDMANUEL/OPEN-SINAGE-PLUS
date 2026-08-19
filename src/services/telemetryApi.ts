const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'open-signage-admin-session';

export interface AnalyticsSummary {
  since: string;
  playback: { total: number; scenes: number; devices: number; durationMs: number };
  interactions: number;
  topScenes: Array<{ sceneToken: string; plays: number; durationMs: number }>;
}

async function send(path: string, body: Record<string, unknown>) {
  try {
    await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
  } catch { /* telemetry is never allowed to break signage */ }
}

export const telemetryApi = {
  proof: (sceneToken: string, deviceToken = '', durationMs?: number) => send('/api/player/proof', { eventType: 'loaded', sceneToken, deviceToken, durationMs }),
  interaction: (sceneToken: string, deviceToken: string, itemId: string, eventType: string, metadata: Record<string, unknown> = {}) => send('/api/player/interaction', { sceneToken, deviceToken, itemId, eventType, metadata }),
  summary: async (hours = 24): Promise<AnalyticsSummary> => {
    const token = localStorage.getItem(SESSION_KEY) || '';
    const response = await fetch(`${API_BASE}/api/platform/analytics/summary?hours=${Math.max(1, hours)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error(`Analytics error ${response.status}`);
    return response.json() as Promise<AnalyticsSummary>;
  },
};
