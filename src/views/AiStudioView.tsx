import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bot, ExternalLink, LoaderCircle, MonitorPlay, Sparkles } from 'lucide-react';
import { openSignageApi, type AiStatus, type PlayerScene } from '../services/openSignageApi';

export default function AiStudioView() {
  const [status, setStatus] = useState<AiStatus>({ configured: false, provider: null, model: null });
  const [prompt, setPrompt] = useState('Crea un anuncio moderno 16:9 para una promoción, con título grande, QR y botón táctil.');
  const [scene, setScene] = useState<PlayerScene | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const playerUrl = useMemo(() => token ? `${window.location.origin}/player/${token}` : '', [token]);

  useEffect(() => { void openSignageApi.aiStatus().then(setStatus).catch(() => setStatus({ configured: false, provider: null, model: null })); }, []);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(''); setToken('');
    try {
      const result = await openSignageApi.generateScene(prompt);
      setScene(result);
      setMessage('Borrador generado. Revisa el preview antes de publicarlo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo generar la escena');
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!scene) return;
    setBusy(true); setMessage('');
    try {
      const result = await openSignageApi.createPlayerScene(scene);
      setToken(result.token);
      setMessage('Escena aprobada y publicada en PLUS Web Player.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar');
    } finally { setBusy(false); }
  }

  return (
    <section className="ai-view">
      <header className="section-header">
        <div><span className="eyebrow">IA GENERATIVA</span><h2>AI Studio</h2><p>Genera campañas como escenas estructuradas, revísalas y publica solo cuando estén aprobadas.</p></div>
        <div className={`ai-status ${status.configured ? 'ai-status--ok' : ''}`}><Bot size={18}/><div><strong>{status.configured ? 'IA conectada' : 'IA sin configurar'}</strong><small>{status.provider ? `${status.provider} · ${status.model}` : 'Ollama local o endpoint API compatible'}</small></div></div>
      </header>

      <div className="ai-grid">
        <form className="workspace-panel form-grid" onSubmit={generate}>
          <div className="panel-title"><h2><Sparkles size={20}/> Generar campaña</h2><p>Describe contenido, estilo, CTA, QR, interacción y formato.</p></div>
          <label>Prompt<textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={9} required /></label>
          <button className="button button--primary" type="submit" disabled={busy || !status.configured}>{busy ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} Generar preview</button>
          {!status.configured && <div className="notice notice--error">Configura AI_PROVIDER, AI_BASE_URL y AI_MODEL. Puedes usar Ollama local o un endpoint chat-compatible.</div>}
          {message && <div className="notice notice--success">{message}</div>}
        </form>

        <div className="workspace-panel">
          <div className="panel-title"><h2><MonitorPlay size={20}/> Preview estructurado</h2><p>La IA no publica automáticamente.</p></div>
          {!scene ? <div className="empty-state">Genera una escena para verla aquí.</div> : <>
            <div className="ai-preview" style={{ background: scene.background || '#050b18' }}>
              {scene.items.map((item, index) => {
                const style = { left: `${item.x ?? 0}%`, top: `${item.y ?? 0}%`, width: `${item.width ?? 100}%`, height: `${item.height ?? 100}%`, zIndex: item.zIndex ?? index };
                if (item.type === 'text') return <div key={index} className="ai-preview__item ai-preview__text" style={{ ...style, color: item.color || '#fff', fontSize: `${Math.max(12, Math.min(36, (item.fontSize || 48) / 2))}px` }}>{item.text}</div>;
                if (item.type === 'button') return <div key={index} className="ai-preview__item ai-preview__button" style={{ ...style, color: item.color || '#fff', background: item.background || '#2166f3' }}>{item.text}</div>;
                if (item.type === 'qr') return <div key={index} className="ai-preview__item ai-preview__qr" style={style}><img src={openSignageApi.qrUrl(item.value)} alt="QR"/></div>;
                if (item.type === 'image') return <img key={index} className="ai-preview__item" style={{ ...style, objectFit: item.fit || 'cover' }} src={item.src} alt=""/>;
                if (item.type === 'video') return <div key={index} className="ai-preview__item ai-preview__media" style={style}>VIDEO</div>;
                return <div key={index} className="ai-preview__item ai-preview__media" style={style}>HTML</div>;
              })}
            </div>
            <div className="scene-meta"><strong>{scene.name}</strong><span>{scene.items.length} elementos · {scene.duration || 15}s</span></div>
            <button className="button button--primary" type="button" disabled={busy} onClick={() => void publish()}><MonitorPlay size={17}/> Aprobar y publicar</button>
            {playerUrl && <a className="button button--dark" href={playerUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/> Abrir player publicado</a>}
          </>}
        </div>
      </div>
    </section>
  );
}
