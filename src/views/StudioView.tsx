import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Copy, ExternalLink, Link2, MonitorPlay, Plus, Sparkles } from 'lucide-react';
import { openSignageApi, type PlayerScene, type XiboPlaylist } from '../services/openSignageApi';

export default function StudioView() {
  const [sceneName, setSceneName] = useState('Lobby Web');
  const [headline, setHeadline] = useState('Bienvenido a Open Signage Plus');
  const [background, setBackground] = useState('#071426');
  const [mediaUrl, setMediaUrl] = useState('');
  const [playerToken, setPlayerToken] = useState('');
  const [layoutName, setLayoutName] = useState('Campaña Open Signage');
  const [resolutionId, setResolutionId] = useState(1);
  const [layoutResult, setLayoutResult] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [pairMessage, setPairMessage] = useState('');
  const [xiboPlaylists, setXiboPlaylists] = useState<XiboPlaylist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [xiboBridgeMessage, setXiboBridgeMessage] = useState('');

  const playerUrl = useMemo(() => playerToken ? `${window.location.origin}/player/${playerToken}` : '', [playerToken]);

  useEffect(() => {
    let disposed = false;
    async function loadPlaylists() {
      try {
        const playlists = await openSignageApi.xiboPlaylists();
        if (disposed) return;
        const usable = playlists.filter(playlist => Number.isInteger(Number(playlist.playlistId)) && Number(playlist.playlistId) > 0);
        setXiboPlaylists(usable);
        if (usable[0]?.playlistId) setSelectedPlaylistId(String(usable[0].playlistId));
      } catch {
        if (!disposed) setXiboPlaylists([]);
      }
    }
    void loadPlaylists();
    return () => { disposed = true; };
  }, []);

  async function publishScene(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setXiboBridgeMessage('');
    try {
      const items: PlayerScene['items'] = [];
      if (mediaUrl.trim()) {
        items.push({
          type: mediaUrl.match(/\.(mp4|webm|mov)(\?|$)/i) ? 'video' : 'image',
          src: mediaUrl.trim(),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 0,
          fit: 'cover',
        });
      }
      items.push({
        type: 'text',
        text: headline,
        x: 8,
        y: 18,
        width: 84,
        height: 64,
        zIndex: 10,
        color: '#ffffff',
        fontSize: 64,
        align: 'center',
      });

      const result = await openSignageApi.createPlayerScene({
        name: sceneName,
        duration: 15,
        background,
        items,
      });
      setPlayerToken(result.token);
      setMessage('Web Player publicado. La URL puede abrirse directamente en cualquier navegador moderno.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar la escena');
    } finally {
      setBusy(false);
    }
  }

  async function createLayout(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setLayoutResult('');
    try {
      const result = await openSignageApi.createLayout({
        name: layoutName,
        resolutionId,
        description: 'Creado desde Open Signage Plus Studio',
        returnDraft: true,
      });
      setLayoutResult(`Layout creado en Xibo: ID ${String(result.layout.layoutId ?? 'nuevo')}`);
    } catch (error) {
      setLayoutResult(error instanceof Error ? error.message : 'No se pudo crear el layout');
    } finally {
      setBusy(false);
    }
  }

  async function copyPlayerUrl() {
    if (!playerUrl) return;
    await navigator.clipboard?.writeText(playerUrl);
    setMessage('URL del player copiada.');
  }

  async function pairPublishedScene() {
    if (!playerToken || !pairingCode.trim()) return;
    setBusy(true);
    setPairMessage('');
    try {
      const device = await openSignageApi.pairDevice(pairingCode.trim().toUpperCase(), playerToken, deviceName.trim());
      setPairMessage(`Pantalla ${device.name || device.pairingCode} vinculada a la escena.`);
      setPairingCode('');
    } catch (error) {
      setPairMessage(error instanceof Error ? error.message : 'No se pudo vincular la pantalla');
    } finally {
      setBusy(false);
    }
  }

  async function sendSceneToXibo() {
    const playlistId = Number(selectedPlaylistId);
    if (!playerUrl || !Number.isInteger(playlistId) || playlistId <= 0) return;
    setBusy(true);
    setXiboBridgeMessage('');
    try {
      const result = await openSignageApi.createXiboWebpageWidget(playlistId, {
        uri: playerUrl,
        name: sceneName.trim() || 'Open Signage PLUS',
        duration: 60,
      });
      setXiboBridgeMessage(`Escena enviada a Xibo como widget Webpage${result.widget.widgetId ? ` #${result.widget.widgetId}` : ''}.`);
    } catch (error) {
      setXiboBridgeMessage(error instanceof Error ? error.message : 'No se pudo enviar la escena a Xibo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="studio-view">
      <header className="section-header">
        <div>
          <span className="eyebrow">CREACIÓN GUIADA</span>
          <h2>Studio</h2>
          <p>Crea una vez y reproduce por navegador o dentro del motor Xibo.</p>
        </div>
      </header>

      <div className="studio-grid">
        <form className="workspace-panel form-grid" onSubmit={publishScene}>
          <div className="panel-title">
            <h2><MonitorPlay size={20} /> PLUS Web Player</h2>
            <p>Escena ligera para Chrome, Edge, Smart TV browser, tablet o panel táctil.</p>
          </div>
          <label>
            Nombre de escena
            <input value={sceneName} onChange={event => setSceneName(event.target.value)} required />
          </label>
          <label>
            Texto principal
            <input value={headline} onChange={event => setHeadline(event.target.value)} required />
          </label>
          <label>
            Fondo
            <input value={background} onChange={event => setBackground(event.target.value)} placeholder="#071426" />
          </label>
          <label>
            Imagen o video por URL (opcional)
            <input value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} placeholder="https://.../contenido.mp4" />
          </label>
          <button className="button button--primary" type="submit" disabled={busy}>
            <Sparkles size={18} /> Publicar Web Player
          </button>

          {message && <div className="notice notice--success">{message}</div>}
          {playerUrl && (
            <div className="player-link-box">
              <strong>URL pública del player</strong>
              <code>{playerUrl}</code>
              <div className="inline-actions">
                <button className="button button--dark" type="button" onClick={() => void copyPlayerUrl()}><Copy size={16} /> Copiar</button>
                <a className="button button--primary" href={playerUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir player</a>
              </div>

              <div className="studio-bridge-box">
                <strong><Link2 size={16} /> Publicar también en Xibo</strong>
                {xiboPlaylists.length > 0 ? (
                  <>
                    <label>
                      Playlist Xibo
                      <select value={selectedPlaylistId} onChange={event => setSelectedPlaylistId(event.target.value)}>
                        {xiboPlaylists.map(playlist => (
                          <option key={String(playlist.playlistId)} value={String(playlist.playlistId)}>
                            {playlist.name || `Playlist ${String(playlist.playlistId)}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="button button--primary" type="button" disabled={busy || !selectedPlaylistId} onClick={() => void sendSceneToXibo()}>
                      <Link2 size={16} /> Enviar escena a Xibo
                    </button>
                  </>
                ) : <p>Conecta Xibo o crea un playlist para reutilizar esta escena en un Xibo Player.</p>}
                {xiboBridgeMessage && <div className="notice notice--success">{xiboBridgeMessage}</div>}
              </div>

              <div className="pairing-box">
                <strong>Vincular una TV / navegador</strong>
                <p>Abra <code>{window.location.origin}/screen</code> en la pantalla y escriba aquí el código de 6 caracteres.</p>
                <label>
                  Código de pantalla
                  <input value={pairingCode} onChange={event => setPairingCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="AB12CD" maxLength={6} />
                </label>
                <label>
                  Nombre de la pantalla
                  <input value={deviceName} onChange={event => setDeviceName(event.target.value)} placeholder="Lobby TV" />
                </label>
                <button className="button button--primary" type="button" disabled={busy || pairingCode.length !== 6} onClick={() => void pairPublishedScene()}>
                  Vincular a escena publicada
                </button>
                {pairMessage && <div className="notice notice--success">{pairMessage}</div>}
              </div>
            </div>
          )}
        </form>

        <form className="workspace-panel form-grid" onSubmit={createLayout}>
          <div className="panel-title">
            <h2><Plus size={20} /> Layout Xibo</h2>
            <p>Genera un layout draft directamente en el motor Xibo.</p>
          </div>
          <label>
            Nombre del layout
            <input value={layoutName} onChange={event => setLayoutName(event.target.value)} required />
          </label>
          <label>
            Resolution ID
            <input type="number" min="1" value={resolutionId} onChange={event => setResolutionId(Number(event.target.value || 1))} required />
          </label>
          <button className="button button--primary" type="submit" disabled={busy}>
            <Plus size={18} /> Crear layout en Xibo
          </button>
          {layoutResult && <div className="notice notice--success">{layoutResult}</div>}
          <div className="studio-hint">
            <strong>Dos rutas, un solo contenido</strong>
            <p>Una escena PLUS publicada puede vincularse a una pantalla browser-first o insertarse como Webpage en un playlist Xibo.</p>
          </div>
        </form>
      </div>
    </section>
  );
}
