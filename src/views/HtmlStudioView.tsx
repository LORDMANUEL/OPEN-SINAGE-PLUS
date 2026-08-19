import { useMemo, useState } from 'react';
import { Code2, Copy, ExternalLink, MonitorPlay } from 'lucide-react';
import { openSignageApi, type PlayerScene } from '../services/openSignageApi';

const DEFAULT_HTML = `<main class="hero">
  <div class="eyebrow">OPEN SIGNAGE PLUS</div>
  <h1>Tu anuncio vive en cualquier navegador</h1>
  <p>HTML + CSS, animaciones y publicación sin APK.</p>
</main>`;

const DEFAULT_CSS = `html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Inter,system-ui,sans-serif}
body{background:#071426;color:white}
.hero{height:100%;display:grid;place-content:center;text-align:center;padding:6vw;box-sizing:border-box;background:radial-gradient(circle at top right,#2563eb55,transparent 38%),#071426}
.eyebrow{font-size:1.2vw;letter-spacing:.25em;opacity:.75}
h1{font-size:5.2vw;line-height:.95;margin:1.2vw 0 1vw;max-width:16ch}
p{font-size:1.8vw;opacity:.82}
@keyframes enter{from{opacity:0;transform:translateY(4vh)}to{opacity:1;transform:none}}
.hero>*{animation:enter .8s cubic-bezier(.2,.8,.2,1) both}`;

function buildDocument(html: string, css: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`;
}

export default function HtmlStudioView() {
  const [name, setName] = useState('Anuncio HTML');
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [duration, setDuration] = useState(20);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [playerToken, setPlayerToken] = useState('');

  const srcDoc = useMemo(() => buildDocument(html, css), [html, css]);
  const playerUrl = playerToken ? `${window.location.origin}/player/${playerToken}` : '';

  async function publish() {
    setBusy(true);
    setMessage('');
    try {
      const scene: PlayerScene = {
        name: name.trim() || 'Anuncio HTML',
        duration: Math.max(1, Math.min(86400, Number(duration) || 20)),
        background: '#000000',
        items: [{ id: 'html-root', type: 'html', html: srcDoc, x: 0, y: 0, width: 100, height: 100, zIndex: 1 }],
      };
      const result = await openSignageApi.createPlayerScene(scene);
      setPlayerToken(result.token);
      setMessage('HTML publicado como escena PLUS. El player lo ejecuta dentro de un iframe sandboxed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar el HTML');
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!playerUrl) return;
    await navigator.clipboard?.writeText(playerUrl);
    setMessage('URL del player copiada.');
  }

  return <section>
    <header className="section-header"><div><span className="eyebrow">CREACIÓN WEB SEGURA</span><h2>HTML Studio</h2><p>Crea anuncios, widgets y experiencias animadas con HTML + CSS y publícalos directamente al Browser Player.</p></div></header>

    <div className="studio-grid">
      <div className="workspace-panel form-grid">
        <div className="panel-title"><h2><Code2 size={20}/> Código</h2><p>El preview y el player usan iframe sandbox sin permisos de script ni acceso al DOM de la plataforma.</p></div>
        <label>Nombre<input value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Duración s<input type="number" min="1" max="86400" value={duration} onChange={event => setDuration(Math.max(1, Number(event.target.value || 1)))} /></label>
        <label>HTML<textarea aria-label="HTML" rows={12} value={html} onChange={event => setHtml(event.target.value)} spellCheck={false} /></label>
        <label>CSS<textarea aria-label="CSS" rows={14} value={css} onChange={event => setCss(event.target.value)} spellCheck={false} /></label>
        <button className="button button--primary" type="button" disabled={busy} onClick={() => void publish()}><MonitorPlay size={17}/>{busy ? 'Publicando…' : 'Publicar HTML'}</button>
        {message && <div className="notice notice--success">{message}</div>}
        {playerUrl && <div className="player-link-box"><strong>URL del player</strong><code>{playerUrl}</code><div className="inline-actions"><button className="button button--dark" type="button" onClick={() => void copyUrl()}><Copy size={15}/> Copiar</button><a className="button button--primary" href={playerUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Abrir</a></div></div>}
      </div>

      <div className="workspace-panel">
        <div className="panel-title"><h2><MonitorPlay size={20}/> Preview</h2><p>La misma composición que recibe el player.</p></div>
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '16 / 9', border: '1px solid rgba(255,255,255,.12)' }}>
          <iframe title="Preview HTML/CSS" sandbox="" srcDoc={srcDoc} style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#000' }}/>
        </div>
        <div className="studio-hint" style={{ marginTop: 16 }}><strong>Modelo de seguridad</strong><p>HTML/CSS sí; JavaScript de usuario no recibe permisos. Para datos dinámicos usa APIs y módulos PLUS controlados en vez de scripts arbitrarios dentro del anuncio.</p></div>
      </div>
    </div>
  </section>;
}
