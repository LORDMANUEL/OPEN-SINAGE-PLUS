import { useEffect, useMemo, useRef, useState } from 'react';
import { openSignageApi, type PlayerAction, type PlayerItem, type PlayerScene, type Ticket } from '../services/openSignageApi';

interface CachedSceneEnvelope { scene: PlayerScene; savedAt: number; version: 2 }

export default function PlayerScreen({ token }: { token: string }) {
  const [scene, setScene] = useState<PlayerScene | null>(null);
  const [offline, setOffline] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [actionError, setActionError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const retryMs = useRef(5000);
  const offlineRef = useRef(false);
  const cacheKey = useMemo(() => `open-signage-player:v2:${token}`, [token]);

  useEffect(() => {
    let disposed = false;
    let timer = 0;

    function loadCached(): PlayerScene | null {
      const raw = localStorage.getItem(cacheKey) || localStorage.getItem(`open-signage-player:${token}`);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as CachedSceneEnvelope | PlayerScene;
        return 'scene' in parsed && parsed.scene ? parsed.scene : parsed as PlayerScene;
      } catch { return null; }
    }

    function cacheScene(next: PlayerScene) {
      const envelope: CachedSceneEnvelope = { scene: next, savedAt: Date.now(), version: 2 };
      localStorage.setItem(cacheKey, JSON.stringify(envelope));
      const urls = next.items.flatMap(item => item.type === 'image' || item.type === 'video' ? [item.src] : item.type === 'qr' ? [openSignageApi.qrUrl(item.value)] : []);
      navigator.serviceWorker?.controller?.postMessage({ type: 'PRECACHE_MEDIA', urls });
    }

    async function load() {
      let delay = 10_000;
      try {
        const next = await openSignageApi.getPlayerScene(token);
        if (disposed) return;
        setScene(next);
        offlineRef.current = false;
        setOffline(false);
        setLastSyncAt(Date.now());
        retryMs.current = 5000;
        cacheScene(next);
      } catch {
        if (disposed) return;
        const cached = loadCached();
        if (cached) setScene(cached);
        offlineRef.current = true;
        setOffline(true);
        retryMs.current = Math.min(60_000, Math.round(retryMs.current * 1.7));
        delay = retryMs.current;
      } finally {
        if (!disposed) timer = window.setTimeout(() => void load(), delay);
      }
    }

    const cached = loadCached();
    if (cached) setScene(cached);
    void load();
    return () => { disposed = true; if (timer) window.clearTimeout(timer); };
  }, [cacheKey, token]);

  useEffect(() => {
    if (!scene) return;
    const watchdog = window.setInterval(() => {
      const staleFor = lastSyncAt ? Date.now() - lastSyncAt : 0;
      if (!offlineRef.current && staleFor > 15 * 60_000 && navigator.onLine) window.location.reload();
    }, 60_000);
    return () => window.clearInterval(watchdog);
  }, [lastSyncAt, scene]);

  async function runAction(action: PlayerAction) {
    setActionError('');
    if (action.type === 'openUrl') { window.location.assign(action.url); return; }
    try { setTicket(await openSignageApi.issueTicket(action.queue, action.prefix || 'A')); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'No se pudo emitir el turno'); }
  }

  if (!scene) return <main className="player-loading" role="main"><div><strong>Open Signage Plus</strong><span>{offline ? 'Sin conexión · esperando contenido en cache…' : 'Conectando player…'}</span></div></main>;

  return (
    <main className="player-stage" role="main" style={{ background: scene.background || '#050b18' }} aria-label={scene.name}>
      {scene.items.map((item, index) => <PlayerItemView item={item} key={item.id || `${item.type}-${index}`} onAction={runAction} />)}
      {offline && <div className="player-offline-badge">offline · last-known-good</div>}
      {(ticket || actionError) && <div className="player-ticket-modal" role="dialog" aria-live="polite">
        {ticket ? <><span>Tu turno</span><strong>{ticket.number}</strong><small>Cola: {ticket.queue}</small></> : <strong>{actionError}</strong>}
        <button type="button" onClick={() => { setTicket(null); setActionError(''); }}>Cerrar</button>
      </div>}
    </main>
  );
}

function PlayerItemView({ item, onAction }: { item: PlayerItem; onAction: (action: PlayerAction) => Promise<void> }) {
  const style = { left: `${item.x ?? 0}%`, top: `${item.y ?? 0}%`, width: `${item.width ?? 100}%`, height: `${item.height ?? 100}%`, zIndex: item.zIndex ?? 0 };
  if (item.type === 'text') return <div className="player-item player-item--text" style={{ ...style, color: item.color || '#fff', fontSize: `${item.fontSize || 48}px`, textAlign: item.align || 'center' }}>{item.text}</div>;
  if (item.type === 'image') return <img className="player-item" style={{ ...style, objectFit: item.fit || 'cover' }} src={item.src} alt="" />;
  if (item.type === 'video') return <video className="player-item" style={{ ...style, objectFit: item.fit || 'cover' }} src={item.src} muted={item.muted !== false} loop={item.loop !== false} autoPlay={item.autoplay !== false} playsInline />;
  if (item.type === 'html') return <iframe className="player-item player-item--html" style={style} srcDoc={item.html} sandbox="" title={item.id || 'Open Signage HTML widget'} />;
  if (item.type === 'qr') return <div className="player-item player-item--qr" style={style}><img src={openSignageApi.qrUrl(item.value)} alt={`QR ${item.label || ''}`} />{item.label && <span>{item.label}</span>}</div>;
  return <button className="player-item player-item--button" style={{ ...style, color: item.color || '#fff', background: item.background || '#2166f3' }} type="button" onClick={() => void onAction(item.action)}>{item.text}</button>;
}
