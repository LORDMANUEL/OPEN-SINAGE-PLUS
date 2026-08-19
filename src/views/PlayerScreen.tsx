import { useEffect, useMemo, useRef, useState } from 'react';
import { openSignageApi, type PlayerAction, type PlayerItem, type PlayerScene, type Ticket } from '../services/openSignageApi';
import { telemetryApi } from '../services/telemetryApi';

interface CachedSceneEnvelope { scene: PlayerScene; savedAt: number; version: 2 }
type TimelineAnimation = 'none' | 'fade' | 'slide' | 'zoom';
type TimelineItem = PlayerItem & { animation?: TimelineAnimation; startAt?: number; endAt?: number };
type VisualScene = PlayerScene & { format?: '16:9' | '9:16' };

export default function PlayerScreen({ token, deviceToken = '' }: { token: string; deviceToken?: string }) {
  const [scene, setScene] = useState<PlayerScene | null>(null);
  const [offline, setOffline] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [actionError, setActionError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const retryMs = useRef(5000);
  const offlineRef = useRef(false);
  const proofRef = useRef('');
  const sceneStartedAt = useRef(Date.now());
  const acceptedSceneIdentity = useRef('');
  const cacheKey = useMemo(() => `open-signage-player:v2:${token}`, [token]);

  useEffect(() => {
    let disposed = false;
    let timer = 0;
    function loadCached(): PlayerScene | null {
      const raw = localStorage.getItem(cacheKey) || localStorage.getItem(`open-signage-player:${token}`);
      if (!raw) return null;
      try { const parsed = JSON.parse(raw) as CachedSceneEnvelope | PlayerScene; return 'scene' in parsed && parsed.scene ? parsed.scene : parsed as PlayerScene; }
      catch { return null; }
    }
    function cacheScene(next: PlayerScene) {
      const envelope: CachedSceneEnvelope = { scene: next, savedAt: Date.now(), version: 2 };
      localStorage.setItem(cacheKey, JSON.stringify(envelope));
      const urls = next.items.flatMap(item => item.type === 'image' || item.type === 'video' ? [item.src] : item.type === 'qr' ? [openSignageApi.qrUrl(item.value)] : []);
      navigator.serviceWorker?.controller?.postMessage({ type: 'PRECACHE_MEDIA', urls });
    }
    function acceptScene(next: PlayerScene) {
      const nextIdentity = sceneIdentity(next);
      if (acceptedSceneIdentity.current !== nextIdentity) {
        acceptedSceneIdentity.current = nextIdentity;
        sceneStartedAt.current = Date.now();
        setElapsedTotal(0);
      }
      setScene(next);
      cacheScene(next);
    }
    async function load() {
      let delay = 10_000;
      try {
        const next = await openSignageApi.getPlayerScene(token);
        if (disposed) return;
        acceptScene(next); offlineRef.current = false; setOffline(false); setLastSyncAt(Date.now()); retryMs.current = 5000;
      } catch {
        if (disposed) return;
        const cached = loadCached(); if (cached) acceptScene(cached);
        offlineRef.current = true; setOffline(true); retryMs.current = Math.min(60_000, Math.round(retryMs.current * 1.7)); delay = retryMs.current;
      } finally { if (!disposed) timer = window.setTimeout(() => void load(), delay); }
    }
    const cached = loadCached(); if (cached) acceptScene(cached); void load();
    return () => { disposed = true; if (timer) window.clearTimeout(timer); };
  }, [cacheKey, token]);

  useEffect(() => {
    if (!scene) return;
    const proofKey = `${token}:${scene.updatedAt || scene.createdAt || scene.name}`;
    if (proofRef.current !== proofKey) { proofRef.current = proofKey; void telemetryApi.proof(token, deviceToken, Math.max(1, Number(scene.duration || 15)) * 1000); }
    const watchdog = window.setInterval(() => {
      const staleFor = lastSyncAt ? Date.now() - lastSyncAt : 0;
      if (!offlineRef.current && staleFor > 15 * 60_000 && navigator.onLine) window.location.reload();
    }, 60_000);
    const timeline = window.setInterval(() => setElapsedTotal((Date.now() - sceneStartedAt.current) / 1000), 100);
    return () => { window.clearInterval(watchdog); window.clearInterval(timeline); };
  }, [deviceToken, lastSyncAt, scene, token]);

  async function runAction(action: PlayerAction, itemId = '') {
    setActionError('');
    void telemetryApi.interaction(token, deviceToken, itemId, action.type, action.type === 'ticket' ? { queue: action.queue } : { url: action.url });
    if (action.type === 'openUrl') { window.location.assign(action.url); return; }
    try { setTicket(await openSignageApi.issueTicket(action.queue, action.prefix || 'A')); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'No se pudo emitir el turno'); }
  }

  if (!scene) return <main className="player-loading" role="main"><div><strong>Open Signage Plus</strong><span>{offline ? 'Sin conexión · esperando contenido en cache…' : 'Conectando player…'}</span></div></main>;
  const visualScene = scene as VisualScene;
  const timelineItems = visualScene.items as TimelineItem[];
  const duration = Math.max(1, Number(visualScene.duration || 15));
  const playhead = elapsedTotal % duration;
  const cycle = Math.floor(elapsedTotal / duration);
  const vertical = visualScene.format === '9:16';
  const canvasStyle = vertical
    ? { position: 'relative' as const, height: '100vh', width: 'min(100vw, 56.25vh)', overflow: 'hidden', background: visualScene.background || '#050b18' }
    : { position: 'relative' as const, width: '100vw', height: 'min(100vh, 56.25vw)', overflow: 'hidden', background: visualScene.background || '#050b18' };

  return <main className="player-stage" role="main" style={{ background: '#000', display: 'grid', placeItems: 'center' }} aria-label={scene.name}>
    <style>{PLAYER_ANIMATION_CSS}</style>
    <div style={canvasStyle} data-format={vertical ? '9:16' : '16:9'}>
      {timelineItems.map((item, index) => {
        const start = Math.max(0, Number(item.startAt ?? 0));
        const end = Math.min(duration, Number(item.endAt ?? duration));
        if (playhead < start || playhead > end) return null;
        return <PlayerItemView item={item} key={`${item.id || `${item.type}-${index}`}-${cycle}`} onAction={action => runAction(action, item.id || `${item.type}-${index}`)} />;
      })}
    </div>
    {offline && <div className="player-offline-badge">offline · last-known-good</div>}
    {(ticket || actionError) && <div className="player-ticket-modal" role="dialog" aria-live="polite">{ticket ? <><span>Tu turno</span><strong>{ticket.number}</strong><small>Cola: {ticket.queue}</small></> : <strong>{actionError}</strong>}<button type="button" onClick={() => { setTicket(null); setActionError(''); }}>Cerrar</button></div>}
  </main>;
}

function PlayerItemView({ item, onAction }: { item: TimelineItem; onAction: (action: PlayerAction) => Promise<void> }) {
  const animation = animationName(item.animation);
  const style = { left: `${item.x ?? 0}%`, top: `${item.y ?? 0}%`, width: `${item.width ?? 100}%`, height: `${item.height ?? 100}%`, zIndex: item.zIndex ?? 0, animation: animation ? `${animation} .55s cubic-bezier(.2,.8,.2,1) both` : undefined };
  if (item.type === 'text') return <div className="player-item player-item--text" style={{ ...style, color: item.color || '#fff', fontSize: `${item.fontSize || 48}px`, textAlign: item.align || 'center' }}>{item.text}</div>;
  if (item.type === 'image') return <img className="player-item" style={{ ...style, objectFit: item.fit || 'cover' }} src={item.src} alt="" />;
  if (item.type === 'video') return <video className="player-item" style={{ ...style, objectFit: item.fit || 'cover' }} src={item.src} muted={item.muted !== false} loop={item.loop !== false} autoPlay={item.autoplay !== false} playsInline />;
  if (item.type === 'html') return <iframe className="player-item player-item--html" style={style} srcDoc={item.html} sandbox="" title={item.id || 'Open Signage HTML widget'} />;
  if (item.type === 'qr') return <div className="player-item player-item--qr" style={style}><img src={openSignageApi.qrUrl(item.value)} alt={`QR ${item.label || ''}`} />{item.label && <span>{item.label}</span>}</div>;
  return <button className="player-item player-item--button" style={{ ...style, color: item.color || '#fff', background: item.background || '#2166f3' }} type="button" onClick={() => void onAction(item.action)}>{item.text}</button>;
}

function animationName(value?: TimelineAnimation) { return value === 'fade' ? 'osFadeIn' : value === 'slide' ? 'osSlideIn' : value === 'zoom' ? 'osZoomIn' : ''; }
function sceneIdentity(scene: PlayerScene | null) { return scene ? `${scene.token || ''}:${scene.updatedAt || scene.createdAt || scene.name}` : ''; }
const PLAYER_ANIMATION_CSS = '@keyframes osFadeIn{from{opacity:0}to{opacity:1}}@keyframes osSlideIn{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}@keyframes osZoomIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}';
