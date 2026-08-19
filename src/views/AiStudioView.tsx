import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bot, ExternalLink, LoaderCircle, MonitorPlay, RefreshCcw, Sparkles } from 'lucide-react';
import { openSignageApi, type AiDiagnostics, type AiHealth, type AiStatus, type PlayerScene } from '../services/openSignageApi';

export default function AiStudioView() {
  const [status, setStatus] = useState<AiStatus>({ configured: false, provider: null, model: null });
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [diagnostics, setDiagnostics] = useState<AiDiagnostics | null>(null);
  const [prompt, setPrompt] = useState('Crea un anuncio moderno 16:9 para una promoción, con título grande, QR y botón táctil.');
  const [revision, setRevision] = useState('Haz el título más grande y mueve el QR a la esquina inferior derecha.');
  const [scene, setScene] = useState<PlayerScene | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const playerUrl = useMemo(() => token ? `${window.location.origin}/player/${token}` : '', [token]);

  async function refreshHealth() {
    try {
      const [base, detail] = await Promise.all([openSignageApi.aiStatus(), openSignageApi.aiHealth()]);
      setStatus(base); setHealth(detail.health); setDiagnostics(detail.diagnostics);
    } catch { setStatus({ configured: false, provider: null, model: null }); setHealth(null); setDiagnostics(null); }
  }
  useEffect(() => { void refreshHealth(); }, []);

  async function generate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setToken('');
    try { setScene(await openSignageApi.generateScene(prompt)); setMessage('Borrador generado con Brand Kit. Revisa el preview antes de publicarlo.'); await refreshHealth(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo generar la escena'); }
    finally { setBusy(false); }
  }
  async function revise() {
    if (!scene || !revision.trim()) return;
    setBusy(true); setMessage('');
    try { setScene(await openSignageApi.reviseScene(scene, revision.trim())); setMessage('Nueva revisión generada. La versión anterior aún no fue publicada.'); await refreshHealth(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo revisar la escena'); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!scene) return;
    setBusy(true); setMessage('');
    try { const result = await openSignageApi.createPlayerScene(scene); setToken(result.token); setMessage('Escena aprobada y publicada en PLUS Web Player.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo publicar'); }
    finally { setBusy(false); }
  }

  return <section className="ai-view">
    <header className="section-header"><div><span className="eyebrow">IA GENERATIVA</span><h2>AI Studio</h2><p>Genera, conversa, revisa y publica únicamente cuando el resultado esté aprobado.</p></div><div className={`ai-status ${health?.ok ? 'ai-status--ok' : ''}`}><Bot size={18}/><div><strong>{health?.ok ? 'IA saludable' : status.configured ? 'IA configurada' : 'IA sin configurar'}</strong><small>{status.provider ? `${status.provider} · ${status.model}${diagnostics?.fallbackConfigured ? ' · fallback activo' : ''}` : 'Ollama local o endpoint API compatible'}</small></div><button className="icon-button icon-button--ghost" type="button" onClick={() => void refreshHealth()}><RefreshCcw size={15}/></button></div></header>
    <div className="ai-grid">
      <form className="workspace-panel form-grid" onSubmit={generate}><div className="panel-title"><h2><Sparkles size={20}/> Generar campaña</h2><p>Describe contenido, estilo, CTA, QR, interacción y formato. El Brand Kit se aplica automáticamente.</p></div><label>Prompt<textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={7} required /></label><button className="button button--primary" type="submit" disabled={busy || !status.configured}>{busy ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} Generar preview</button>{!status.configured && <div className="notice notice--error">Configura AI_PROVIDER, AI_BASE_URL y AI_MODEL, o habilita Ollama local.</div>}{diagnostics?.metrics && <small>{diagnostics.metrics.requests || 0} solicitudes · {diagnostics.metrics.failures || 0} fallos · latencia {diagnostics.metrics.lastLatencyMs ?? '—'} ms</small>}{message && <div className="notice notice--success">{message}</div>}</form>
      <div className="workspace-panel"><div className="panel-title"><h2><MonitorPlay size={20}/> Preview estructurado</h2><p>La IA nunca publica automáticamente.</p></div>{!scene ? <div className="empty-state">Genera una escena para verla aquí.</div> : <><div className="ai-preview" style={{ background: scene.background || '#050b18' }}>{scene.items.map((item, index) => { const style = { left: `${item.x ?? 0}%`, top: `${item.y ?? 0}%`, width: `${item.width ?? 100}%`, height: `${item.height ?? 100}%`, zIndex: item.zIndex ?? index }; if (item.type === 'text') return <div key={index} className="ai-preview__item ai-preview__text" style={{ ...style, color: item.color || '#fff', fontSize: `${Math.max(12, Math.min(36, (item.fontSize || 48) / 2))}px` }}>{item.text}</div>; if (item.type === 'button') return <div key={index} className="ai-preview__item ai-preview__button" style={{ ...style, color: item.color || '#fff', background: item.background || '#2166f3' }}>{item.text}</div>; if (item.type === 'qr') return <div key={index} className="ai-preview__item ai-preview__qr" style={style}><img src={openSignageApi.qrUrl(item.value)} alt="QR"/></div>; if (item.type === 'image') return <img key={index} className="ai-preview__item" style={{ ...style, objectFit: item.fit || 'cover' }} src={item.src} alt=""/>; return <div key={index} className="ai-preview__item ai-preview__media" style={style}>{item.type.toUpperCase()}</div>; })}</div><div className="scene-meta"><strong>{scene.name}</strong><span>{scene.items.length} elementos · {scene.duration || 15}s</span></div><label>Revisión conversacional<textarea rows={3} value={revision} onChange={event => setRevision(event.target.value)}/></label><div className="inline-actions"><button className="button button--dark" type="button" disabled={busy || !revision.trim()} onClick={() => void revise()}><RefreshCcw size={17}/> Aplicar revisión</button><button className="button button--primary" type="button" disabled={busy} onClick={() => void publish()}><MonitorPlay size={17}/> Aprobar y publicar</button></div>{playerUrl && <a className="button button--dark" href={playerUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/> Abrir player publicado</a>}</>}</div>
    </div>
  </section>;
}
