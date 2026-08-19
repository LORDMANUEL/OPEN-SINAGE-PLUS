import { useEffect, useRef, useState } from 'react';
import { Monitor, Wifi } from 'lucide-react';
import { openSignageApi, type PlayerDevice } from '../services/openSignageApi';
import PlayerScreen from './PlayerScreen';

const DEVICE_KEY = 'open-signage-device-token';
const APP_VERSION = '2.1.0';

export default function DeviceScreen({ initialToken }: { initialToken?: string | null }) {
  const [device, setDevice] = useState<PlayerDevice | null>(null);
  const [error, setError] = useState('');
  const errorRef = useRef('');
  const reconnectDelay = useRef(4000);

  useEffect(() => {
    let disposed = false;
    let pollTimer = 0;
    let heartbeatTimer = 0;
    const setConnectionError = (value: string) => { errorRef.current = value; if (!disposed) setError(value); };

    async function deviceMetadata(currentSceneToken?: string | null) {
      let storageFreeBytes: number | null = null;
      let storageQuotaBytes: number | null = null;
      try {
        const estimate = await navigator.storage?.estimate?.();
        storageQuotaBytes = estimate?.quota ?? null;
        storageFreeBytes = estimate?.quota != null && estimate?.usage != null ? Math.max(0, estimate.quota - estimate.usage) : null;
      } catch { /* optional */ }
      return { appVersion: APP_VERSION, resolution: `${window.screen.width}x${window.screen.height}`, orientation: window.screen.width >= window.screen.height ? 'landscape' : 'portrait', storageFreeBytes, storageQuotaBytes, currentSceneToken: currentSceneToken || undefined, lastError: errorRef.current };
    }

    async function boot() {
      try {
        let token = initialToken || localStorage.getItem(DEVICE_KEY) || '';
        let current: PlayerDevice;
        if (token) {
          try { current = await openSignageApi.getDevice(token); }
          catch { current = await openSignageApi.registerDevice(); }
        } else current = await openSignageApi.registerDevice();
        if (disposed) return;
        localStorage.setItem(DEVICE_KEY, current.deviceToken);
        if (window.location.pathname !== `/screen/${current.deviceToken}`) window.history.replaceState({}, '', `/screen/${current.deviceToken}`);
        setDevice(current); setConnectionError(''); reconnectDelay.current = 4000;

        async function poll() {
          try {
            const next = await openSignageApi.getDevice(current.deviceToken);
            if (!disposed) { setDevice(next); setConnectionError(''); reconnectDelay.current = 4000; }
          } catch {
            if (!disposed) { setConnectionError('Sin conexión con el servidor. Reintentando…'); reconnectDelay.current = Math.min(60_000, reconnectDelay.current * 2); }
          } finally { if (!disposed) pollTimer = window.setTimeout(() => void poll(), reconnectDelay.current); }
        }
        async function heartbeat() {
          try {
            const latestScene = current.sceneToken;
            const next = await openSignageApi.heartbeatDevice(current.deviceToken, await deviceMetadata(latestScene));
            if (!disposed) setDevice(previous => ({ ...(previous || next), ...next }));
          } catch { /* poll owns connectivity UX */ }
          if (!disposed) heartbeatTimer = window.setTimeout(() => void heartbeat(), 15_000);
        }
        pollTimer = window.setTimeout(() => void poll(), 4000);
        heartbeatTimer = window.setTimeout(() => void heartbeat(), 1000);
      } catch (bootError) { setConnectionError(bootError instanceof Error ? bootError.message : 'No se pudo registrar la pantalla'); }
    }

    void boot();
    return () => { disposed = true; if (pollTimer) window.clearTimeout(pollTimer); if (heartbeatTimer) window.clearTimeout(heartbeatTimer); };
  }, [initialToken]);

  if (device?.sceneToken) return <PlayerScreen token={device.sceneToken} />;
  return <main className="pairing-stage" role="main"><div className="pairing-card"><div className="pairing-logo"><Monitor size={42}/></div><span className="eyebrow eyebrow--light">OPEN SIGNAGE PLUS</span><h1>Vincula esta pantalla</h1><p>En el panel de administración abre <strong>Studio</strong>, publica una escena y escribe este código.</p><div className="pairing-code" aria-label="Código de vinculación">{device?.pairingCode || '······'}</div><div className="pairing-status"><Wifi size={17}/><span>{error || 'Esperando asignación…'}</span></div><small>Esta pantalla conserva su identidad, reporta salud al servidor y no necesita APK.</small></div></main>;
}
