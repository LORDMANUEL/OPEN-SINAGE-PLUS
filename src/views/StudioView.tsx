import { useMemo, useState, type FormEvent } from 'react';
import { Copy, ExternalLink, Link2, MonitorPlay, Plus, Sparkles } from 'lucide-react';
import { openSignageApi, type PlayerScene } from '../services/openSignageApi';

export default function StudioView() {
  const [sceneName, setSceneName] = useState('Lobby Web');
  const [headline, setHeadline] = useState('Bienvenido a Open Signage Plus');
  const [background, setBackground] = useState('#071426');
  const [mediaUrl, setMediaUrl] = useState('');
  const [playerToken, setPlayerToken] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [deviceName, setDeviceName] = useState('Pantalla Lobby');
  const [layoutName, setLayoutName] = useState('Campaña Open Signage');
  const [resolutionId, setResolutionId] = useState(1);
  const [layoutResult, setLayoutResult] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const playerUrl = useMemo(() => playerToken ? `${window.location.origin}/player/${playerToken}` : '', [playerToken]);
  const screenUrl = `${window.location.origin}/screen`;

  async function publishScene(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      const items: PlayerScene['items'] = [];
      if (mediaUrl.trim()) {
        items.push({ type: mediaUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? 'video' : 'image', src: mediaUrl.trim(), x: 0, y: 0, width: 100, height: 100, zIndex: 0, fit: 'cover' });
      }
      items.push({ type: 'text', text: headline, x: 8, y: 18, width: 84, height: 64, zIndex: 10, color: '#ffffff', fontSize: 64, align: 'center' });
      const result = await openSignageApi.createPlayerScene({ name: sceneName, duration: 15, background, items });
      setPlayerToken(result.token);
      setMessage('Escena publicada. Puedes abrir su URL directa o vincularla a una pantalla con código corto.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo publicar la escena'); }
    finally { setBusy(false); }
  }

  async function pairScreen(event: FormEvent) {
    event.preventDefault();
    if (!playerToken) { setMessage('Primero publica la escena que quieres asignar.'); return; }
    setBusy(true); setMessage('');
    try {
      const device = await openSignageApi.pairDevice(pairingCode.trim().toUpperCase(), playerToken, deviceName);
      setMessage(`Pantalla ${device.name || device.pairingCode} vinculada. Empezará a reproducir automáticamente.`);
      setPairingCode('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo vincular la pantalla'); }
    finally { setBusy(false); }
  }

  async function createLayout(event: FormEvent) {
    event.preventDefault(); setBusy(true); setLayoutResult('');
    try {
      const result = await openSignageApi.createLayout({ name: layoutName, resolutionId, description: 'Creado desde Open Signage Plus Studio', returnDraft: true });
      setLayoutResult(`Layout creado en Xibo: ID ${String(result.layout.layoutId ?? 'nuevo')}`);
    } catch (error) { setLayoutResult(error instanceof Error ? error.message : 'No se pudo crear el layout'); }
    finally { setBusy(false); }
  }

  async function copyPlayerUrl() {
    if (!playerUrl) return;
    await navigator.clipboard?.writeText(playerUrl);
    setMessage('URL del player copiada.');
  }

  return (
    <section className="studio-view">
      <header className="section-header"><div><span className="eyebrow">CREACIÓN GUIADA</span><h2>Studio</h2><p>Crea contenido para Xibo y publica escenas browser-first sin entrar al CMS nativo.</p></div></header>
      <div className="studio-grid">
        <div className="studio-column">
          <form className="workspace-panel form-grid" onSubmit={publishScene}>
            <div className="panel-title"><h2><MonitorPlay size={20} /> PLUS Web Player</h2><p>Escena ligera para Chrome, Edge, Smart TV browser, tablet o panel táctil.</p></div>
            <label>Nombre de escena<input value={sceneName} onChange={event => setSceneName(event.target.value)} required /></label>
            <label>Texto principal<input value={headline} onChange={event => setHeadline(event.target.value)} required /></label>
            <label>Fondo<input value={background} onChange={event => setBackground(event.target.value)} placeholder="#071426" /></label>
            <label>Imagen o video por URL (opcional)<input value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} placeholder="https://.../contenido.mp4" /></label>
            <button className="button button--primary" type="submit" disabled={busy}><Sparkles size={18} /> Publicar Web Player</button>
            {message && <div className="notice notice--success">{message}</div>}
            {playerUrl && <div className="player-link-box"><strong>URL pública directa</strong><code>{playerUrl}</code><div className="inline-actions"><button className="button button--dark" type="button" onClick={() => void copyPlayerUrl()}><Copy size={16} /> Copiar</button><a className="button button--primary" href={playerUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir player</a></div></div>}
          </form>

          <form className="workspace-panel form-grid" onSubmit={pairScreen}>
            <div className="panel-title"><h2><Link2 size={20}/> Vincular pantalla</h2><p>En la TV abre <strong>{screenUrl}</strong>. Aparecerá un código de 6 caracteres.</p></div>
            <label>Código de pantalla<input aria-label="Código de pantalla" value={pairingCode} maxLength={6} onChange={e => setPairingCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="AB12CD" required /></label>
            <label>Nombre de la pantalla<input value={deviceName} onChange={e => setDeviceName(e.target.value)} placeholder="Lobby TV" /></label>
            <button className="button button--primary" type="submit" disabled={busy || !playerToken || pairingCode.length !== 6}><Link2 size={17}/> Vincular a escena publicada</button>
            {!playerToken && <div className="studio-hint"><strong>Publica primero</strong><p>La vinculación usa la escena Web Player que acabas de aprobar/publicar.</p></div>}
          </form>
        </div>

        <form className="workspace-panel form-grid" onSubmit={createLayout}>
          <div className="panel-title"><h2><Plus size={20} /> Layout Xibo</h2><p>Genera un layout draft directamente en el motor Xibo.</p></div>
          <label>Nombre del layout<input value={layoutName} onChange={event => setLayoutName(event.target.value)} required /></label>
          <label>Resolution ID<input type="number" min="1" value={resolutionId} onChange={event => setResolutionId(Number(event.target.value || 1))} required /></label>
          <button className="button button--primary" type="submit" disabled={busy}><Plus size={18} /> Crear layout en Xibo</button>
          {layoutResult && <div className="notice notice--success">{layoutResult}</div>}
          <div className="studio-hint"><strong>Siguiente paso</strong><p>El layout queda en Xibo para agregar widgets/media y luego puede publicarse/programarse desde Motor Xibo.</p></div>
        </form>
      </div>
    </section>
  );
}
