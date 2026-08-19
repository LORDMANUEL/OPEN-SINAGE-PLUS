import { useEffect, useState } from 'react';
import { Monitor, Wifi } from 'lucide-react';
import { openSignageApi, type PlayerDevice } from '../services/openSignageApi';
import PlayerScreen from './PlayerScreen';

const DEVICE_KEY = 'open-signage-device-token';

export default function DeviceScreen({ initialToken }: { initialToken?: string | null }) {
  const [device, setDevice] = useState<PlayerDevice | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    let timer = 0;

    async function boot() {
      try {
        let token = initialToken || localStorage.getItem(DEVICE_KEY) || '';
        let current: PlayerDevice;
        if (token) {
          try { current = await openSignageApi.getDevice(token); }
          catch { token = ''; current = await openSignageApi.registerDevice(); }
        } else {
          current = await openSignageApi.registerDevice();
        }
        if (disposed) return;
        localStorage.setItem(DEVICE_KEY, current.deviceToken);
        if (window.location.pathname !== `/screen/${current.deviceToken}`) window.history.replaceState({}, '', `/screen/${current.deviceToken}`);
        setDevice(current);
        setError('');

        timer = window.setInterval(async () => {
          try {
            const next = await openSignageApi.getDevice(current.deviceToken);
            if (!disposed) { setDevice(next); setError(''); }
          } catch {
            if (!disposed) setError('Sin conexión con el servidor. Reintentando…');
          }
        }, 4000);
      } catch (bootError) {
        if (!disposed) setError(bootError instanceof Error ? bootError.message : 'No se pudo registrar la pantalla');
      }
    }

    void boot();
    return () => { disposed = true; if (timer) window.clearInterval(timer); };
  }, [initialToken]);

  if (device?.sceneToken) return <PlayerScreen token={device.sceneToken} />;

  return (
    <main className="pairing-stage" role="main">
      <div className="pairing-card">
        <div className="pairing-logo"><Monitor size={42}/></div>
        <span className="eyebrow eyebrow--light">OPEN SIGNAGE PLUS</span>
        <h1>Vincula esta pantalla</h1>
        <p>En el panel de administración abre <strong>Studio</strong>, publica una escena y escribe este código.</p>
        <div className="pairing-code" aria-label="Código de vinculación">{device?.pairingCode || '······'}</div>
        <div className="pairing-status"><Wifi size={17}/><span>{error || 'Esperando asignación…'}</span></div>
        <small>Esta pantalla conservará su identidad en este navegador. No necesita APK.</small>
      </div>
    </main>
  );
}
