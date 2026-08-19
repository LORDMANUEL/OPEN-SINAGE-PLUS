import { useEffect, useMemo, useState } from 'react';
import { openSignageApi, type PlayerAction, type PlayerItem, type PlayerScene, type Ticket } from '../services/openSignageApi';

export default function PlayerScreen({ token }: { token: string }) {
  const [scene, setScene] = useState<PlayerScene | null>(null);
  const [offline, setOffline] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [actionError, setActionError] = useState('');
  const cacheKey = useMemo(() => `open-signage-player:${token}`, [token]);

  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const next = await openSignageApi.getPlayerScene(token);
        if (disposed) return;
        setScene(next); setOffline(false); localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        if (disposed) return;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try { setScene(JSON.parse(cached) as PlayerScene); setOffline(true); }
          catch { setScene(null); }
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [cacheKey, token]);

  async function runAction(action: PlayerAction) {
    setActionError('');
    if (action.type === 'openUrl') {
      window.location.assign(action.url);
      return;
    }
    try {
      const issued = await openSignageApi.issueTicket(action.queue, action.prefix || 'A');
      setTicket(issued);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo emitir el turno');
    }
  }

  if (!scene) return <main className="player-loading" role="main"><div><strong>Open Signage Plus</strong><span>Conectando player…</span></div></main>;

  return (
    <main className="player-stage" role="main" style={{ background: scene.background || '#050b18' }} aria-label={scene.name}>
      {scene.items.map((item, index) => <PlayerItemView item={item} key={item.id || `${item.type}-${index}`} onAction={runAction} />)}
      {offline && <div className="player-offline-badge">offline · cache local</div>}
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
