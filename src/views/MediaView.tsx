import { useEffect, useState, type FormEvent } from 'react';
import { FileImage, RefreshCw, Search, Sparkles, UploadCloud } from 'lucide-react';
import { openSignageApi, type XiboMedia } from '../services/openSignageApi';
import { adminPlatformApi, type MediaCatalogItem } from '../services/adminPlatformApi';

export default function MediaView() {
  const [media, setMedia] = useState<XiboMedia[]>([]);
  const [catalog, setCatalog] = useState<MediaCatalogItem[]>([]);
  const [orphans, setOrphans] = useState<MediaCatalogItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('open-signage');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [normalizeVideo, setNormalizeVideo] = useState(true);
  const [preset, setPreset] = useState<'screen-1080p' | 'screen-720p'>('screen-1080p');

  async function refresh() {
    setLoading(true); setMessage('');
    try {
      const [xibo, indexed, unused] = await Promise.all([openSignageApi.xiboLibrary(), adminPlatformApi.mediaCatalog(query), adminPlatformApi.mediaOrphans(30)]);
      setMedia(xibo); setCatalog(indexed); setOrphans(unused);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar la biblioteca'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file) { setMessage('Selecciona un archivo primero.'); return; }
    setUploading(true); setMessage('');
    try {
      if (normalizeVideo && file.type.startsWith('video/')) {
        const result = await adminPlatformApi.transcodeUpload(file, preset, name.trim(), tags.trim());
        const saved = result.transcode.inputBytes - result.transcode.outputBytes;
        setMessage(`Video normalizado a H.264/AAC y enviado a Xibo. ${saved > 0 ? `Ahorro aproximado ${formatBytes(saved)}.` : ''}${result.catalog.deduplicated ? ' Se reutilizó un archivo idéntico.' : ''}`);
      } else {
        const uploaded = await openSignageApi.uploadMedia(file, name.trim() || undefined, tags.trim() || undefined);
        setMessage(`${uploaded.length || 1} archivo(s) enviado(s) a Xibo.`);
      }
      setFile(null); setName(''); await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo subir el archivo'); }
    finally { setUploading(false); }
  }

  return <section className="media-view">
    <header className="section-header"><div><span className="eyebrow">BIBLIOTECA XIBO + CATÁLOGO PLUS</span><h2>Media</h2><p>Deduplicación SHA-256, búsqueda, detección de huérfanos y normalización FFmpeg para TVs.</p></div><button className="button button--dark" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={17} className={loading ? 'spin' : ''}/> Actualizar</button></header>
    <div className="media-grid-layout">
      <form className="workspace-panel form-grid" onSubmit={upload}>
        <div className="panel-title"><h2><UploadCloud size={20}/> Subir contenido</h2><p>Las credenciales Xibo permanecen exclusivamente en el backend.</p></div>
        <label>Archivo<input aria-label="Archivo multimedia" type="file" accept="image/*,video/*,.pdf,.html,.zip" onChange={event => setFile(event.target.files?.[0] ?? null)}/></label>
        <label>Nombre amigable<input value={name} onChange={event => setName(event.target.value)} placeholder={file?.name || 'Promoción Agosto'}/></label>
        <label>Tags<input value={tags} onChange={event => setTags(event.target.value)} placeholder="open-signage,campaña"/></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={normalizeVideo} onChange={event => setNormalizeVideo(event.target.checked)} style={{ width: 18, height: 18 }}/><Sparkles size={16}/> Normalizar video para pantallas</label>
        {normalizeVideo && <label>Preset<select value={preset} onChange={event => setPreset(event.target.value as typeof preset)}><option value="screen-1080p">1080p H.264/AAC</option><option value="screen-720p">720p ligero H.264/AAC</option></select></label>}
        {file && <div className="upload-summary"><strong>{file.name}</strong><span>{formatBytes(file.size)} · {file.type || 'tipo desconocido'}</span></div>}
        <button className="button button--primary" type="submit" disabled={uploading || !file}><UploadCloud size={18}/> {uploading ? 'Procesando…' : normalizeVideo && file?.type.startsWith('video/') ? 'Normalizar y subir' : 'Subir a Xibo'}</button>
        {message && <div className="notice notice--success">{message}</div>}
      </form>

      <div className="workspace-panel"><div className="panel-title"><h2>Catálogo inteligente</h2><p>{catalog.length} índices PLUS · {media.length} elementos Xibo · {orphans.length} candidatos huérfanos.</p></div><div className="inline-actions"><label style={{ flex: 1 }}>Buscar<div style={{ display: 'flex', gap: 8 }}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="nombre, tag, hash"/><button className="button button--dark" type="button" onClick={() => void refresh()}><Search size={15}/> Buscar</button></div></label></div>
        {loading ? <div className="empty-state">Cargando biblioteca…</div> : <div className="resource-list">{catalog.length > 0 ? catalog.map(item => <div className="resource-row" key={item.id}><div className="resource-row__main"><span className="resource-icon"><FileImage size={18}/></span><div><strong>{item.displayName || item.fileName}</strong><small>{item.contentType || 'archivo'} · {formatBytes(Number(item.bytes || 0))} · usos {item.useCount || 0}</small><small>SHA-256 {item.sha256.slice(0, 16)}… · {item.tags || 'sin tags'}</small></div></div>{orphans.some(orphan => orphan.id === item.id) && <span className="notice notice--error">posible huérfano</span>}</div>) : media.map((item, index) => <div className="resource-row" key={String(item.mediaId ?? index)}><div className="resource-row__main"><span className="resource-icon"><FileImage size={18}/></span><div><strong>{String(item.name ?? item.fileName ?? `Media ${index + 1}`)}</strong><small>ID {String(item.mediaId ?? '—')} · {String(item.mediaType ?? 'archivo')} · {formatBytes(Number(item.fileSize || 0))}</small></div></div></div>)}</div>}
      </div>
    </div>
  </section>;
}

function formatBytes(value: number) { if (!Number.isFinite(value) || value <= 0) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1); return `${(value / (1024 ** index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`; }
